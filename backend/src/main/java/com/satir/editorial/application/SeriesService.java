package com.satir.editorial.application;

import com.satir.editorial.infrastructure.*;
import com.satir.platform.ApiException;
import com.satir.platform.IdempotentCommands;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class SeriesService {
    private final SeriesRepository repository;
    private final ArticleRepository articles;
    private final EditorialWriteLock writeLock;
    private final IdempotentCommands commands;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final com.satir.media.application.MediaService media;
    public SeriesService(SeriesRepository repository,ArticleRepository articles,EditorialWriteLock writeLock,IdempotentCommands commands,ObjectMapper mapper,Clock clock,com.satir.media.application.MediaService media){this.repository=repository;this.articles=articles;this.writeLock=writeLock;this.commands=commands;this.mapper=mapper;this.clock=clock;this.media=media;}
    public Object create(UUID owner,String key,SeriesInput input){return commands.execute(owner.toString(),"/studio/series",key,input,()->{
        writeLock.acquire();validate(input);UUID id=UUID.randomUUID();
        try{repository.create(id,owner,input.slug(),mapper.writeValueAsString(input),clock.instant());}catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"SLUG_CONFLICT");}
        repository.cover(id,input.cover().assetId());membership(id,List.of(),input.chapterIds(),input.articleVersions());return edit(id);
    });}
    @Transactional public Map<String,Object> update(UUID id,long version,SeriesInput input){
        writeLock.acquire();var stored=require(id);version(stored,version);validate(input);
        membership(id,repository.chapters(id,false),input.chapterIds(),input.articleVersions());
        try{repository.save(id,input.slug(),mapper.writeValueAsString(input),clock.instant());}catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"SLUG_CONFLICT");}
        repository.cover(id,input.cover().assetId());return edit(id);
    }
    public Object action(UUID owner,UUID id,String key,long version,String action){return commands.execute(owner.toString(),"/studio/series/"+id+"/actions",key,Map.of("version",version,"action",action),()->{
        writeLock.acquire();var stored=require(id);version(stored,version);
        String next=switch(action){
            case "publish" -> {if(!Set.of("draft","published").contains(stored.status()))throw new ApiException(409,"INVALID_TRANSITION");if(repository.chapters(id,true).isEmpty())throw new ApiException(422,"SERIES_NOT_PUBLISHABLE");yield "published";}
            case "save-draft" -> {if(!Set.of("draft","published").contains(stored.status()))throw new ApiException(409,"INVALID_TRANSITION");yield "draft";}
            case "archive" -> {if(stored.status().equals("trashed"))throw new ApiException(409,"INVALID_TRANSITION");yield "archived";}
            case "trash" -> "trashed";
            case "restore" -> {if(!Set.of("archived","trashed").contains(stored.status()))throw new ApiException(409,"INVALID_TRANSITION");yield "draft";}
            default -> throw new ApiException(422,"INVALID_ACTION");
        };
        if(!next.equals(stored.status()))repository.state(id,next,clock.instant());return edit(id);
    });}
    @Transactional public void trash(UUID id,long version){writeLock.acquire();var found=repository.byId(id);if(found.isEmpty()||found.get().status().equals("trashed"))return;version(found.get(),version);repository.state(id,"trashed",clock.instant());}
    public boolean slugAvailable(String slug){return repository.slugAvailable(slug);}
    public Map<String,Object> edit(UUID id){var s=require(id);var result=new LinkedHashMap<String,Object>();mapper.convertValue(input(s),Map.class).forEach((k,v)->result.put(k.toString(),v));result.put("chapterIds",repository.chapters(id,false));result.put("articleVersions",List.of());result.put("id",id);result.put("status",s.status());result.put("version",s.version());result.put("createdAt",s.created());result.put("updatedAt",s.updated());return result;}
    public Object bySlug(String slug){var s=repository.bySlug(slug).orElseThrow(()->new ApiException(404,"NOT_FOUND"));if(!s.slug().equals(slug))return Map.of("resolution","redirect","canonicalPath","/seriler/"+s.slug());var result=summary(s);result.put("presentation",input(s).presentation());result.put("seo",input(s).seo());return result;}
    public Object list(boolean owner,String status,String q,int page,int size,String sort){
        bounds(page,size);if(!sort.equals("title_asc"))throw new ApiException(422,"INVALID_SORT");if(status!=null&&!Set.of("draft","published","archived","trashed").contains(status))throw new ApiException(422,"INVALID_STATUS");q=query(q);
        long total=repository.count(owner,status,q);var items=repository.list(owner,status,q,page,size).stream().map(s->owner?edit(s.id()):summary(s)).toList();return page(items,page,size,total,sort);
    }
    public Object chapters(UUID id,int page,int size,java.util.function.Function<ArticleRepository.Stored,Map<String,Object>> projection){
        bounds(page,size);repository.publicById(id).orElseThrow(()->new ApiException(404,"NOT_FOUND"));var ids=repository.chapters(id,true);var items=new ArrayList<Map<String,Object>>();
        for(int n=page*size;n<Math.min(ids.size(),(page+1)*size);n++){var article=articles.byId(ids.get(n),false).filter(a->a.status().equals("published")&&a.visibility().equals("public"));if(article.isPresent()){var m=new LinkedHashMap<>(projection.apply(article.get()));m.put("chapterNumber",n+1);items.add(m);}}
        return page(items,page,size,ids.size(),"position_asc");
    }
    public Optional<Map<String,Object>> publicSummary(UUID id){return repository.publicById(id).map(s->summary(s));}
    public List<UUID> publicChapterIds(UUID id){repository.publicById(id).orElseThrow(()->new ApiException(404,"NOT_FOUND"));return repository.chapters(id,true);}
    public Object navigation(UUID article){
        var membership=repository.membership(article);if(membership.isEmpty())return null;var found=repository.publicById(membership.get());if(found.isEmpty())return null;var s=found.get();var chapters=repository.chapters(s.id(),true);int index=chapters.indexOf(article);if(index<0)return null;
        var m=new LinkedHashMap<String,Object>();m.put("id",s.id());m.put("slug",s.slug());m.put("title",input(s).title());m.put("position",index+1);m.put("total",chapters.size());m.put("previous",index>0?link(chapters.get(index-1)):null);m.put("next",index+1<chapters.size()?link(chapters.get(index+1)):null);return m;
    }
    private Object link(UUID id){return articles.byId(id,false).filter(a->a.status().equals("published")&&a.visibility().equals("public")).map(a->Map.of("id",id,"slug",a.slug(),"title",mapper.readTree(a.content()).get("title").asText(),"url","/yazilar/"+a.slug())).orElse(null);}
    /** Called only under the shared editorial lock in an existing command transaction. */
    public void placeArticle(UUID article,ArticleInput.SeriesPlacement placement,List<ArticleInput.SeriesVersion> versions){
        UUID old=repository.membership(article).orElse(null),target=placement==null?null:placement.seriesId();
        if(Objects.equals(old,target)){if(!versions.isEmpty())throw new ApiException(409,"INVALID_SERIES_VERSIONS");return;}
        Set<UUID> changed=new HashSet<>();if(old!=null)changed.add(old);if(target!=null)changed.add(target);
        Map<UUID,Long> supplied=new HashMap<>();for(var v:versions){if(v==null||v.id()==null||supplied.put(v.id(),v.version())!=null)throw new ApiException(409,"INVALID_SERIES_VERSIONS");}
        if(!supplied.keySet().equals(changed))throw new ApiException(409,"SERIES_VERSIONS_REQUIRED");for(UUID id:changed)version(require(id),supplied.get(id));
        if(old!=null){var ids=new ArrayList<>(repository.chapters(old,false));ids.remove(article);repository.replaceChapters(old,ids);repository.touch(old,clock.instant());}
        if(target!=null){var s=require(target);if(Set.of("archived","trashed").contains(s.status()))throw new ApiException(409,"SERIES_UNAVAILABLE");var ids=new ArrayList<>(repository.chapters(target,false));if(ids.size()>=200)throw new ApiException(409,"SERIES_FULL");var incoming=articles.byId(article,false).orElseThrow();int insert=0;while(insert<ids.size()){var existing=articles.byId(ids.get(insert),false).orElseThrow();int order=existing.created().compareTo(incoming.created());if(order>0||order==0&&existing.id().compareTo(article)>0)break;insert++;}ids.add(insert,article);repository.replaceChapters(target,ids);repository.touch(target,clock.instant());}
    }
    public void publishForArticle(UUID article,Long requested){
        UUID id=repository.membership(article).orElseThrow(()->new ApiException(409,"SERIES_NOT_FOUND"));var s=require(id);if(requested==null)throw new ApiException(428,"SERIES_VERSION_REQUIRED");version(s,requested);if(!s.status().equals("draft"))throw new ApiException(409,"INVALID_TRANSITION");repository.state(id,"published",clock.instant());
    }
    public ArticleInput.SeriesPlacement placement(UUID article){return repository.membership(article).map(ArticleInput.SeriesPlacement::new).orElse(null);}
    private void membership(UUID series,List<UUID> before,List<UUID> after,List<SeriesInput.Version> versions){
        var changed=new HashSet<>(before);changed.addAll(after);var common=new HashSet<>(before);common.retainAll(after);changed.removeAll(common);
        Map<UUID,Long> supplied=new HashMap<>();for(var v:versions)if(supplied.put(v.id(),v.version())!=null)throw new ApiException(409,"INVALID_ARTICLE_VERSIONS");if(!supplied.keySet().equals(changed))throw new ApiException(409,"ARTICLE_VERSIONS_REQUIRED");
        for(UUID id:after){var member=repository.membership(id);if(member.isPresent()&&!member.get().equals(series))throw new ApiException(409,"ARTICLE_ALREADY_IN_SERIES");if(articles.byId(id,false).isEmpty())throw new ApiException(409,"ARTICLE_NOT_FOUND");}
        for(UUID id:changed.stream().sorted().toList()){var article=articles.byId(id,true).orElseThrow(()->new ApiException(409,"ARTICLE_NOT_FOUND"));if(article.version()!=supplied.get(id))throw new ApiException(412,"STALE_VERSION");}
        repository.replaceChapters(series,after);for(UUID id:changed)repository.touchArticle(id,clock.instant());
    }
    private LinkedHashMap<String,Object> summary(SeriesRepository.Stored s){var i=input(s);var m=new LinkedHashMap<String,Object>();m.put("id",s.id());m.put("slug",s.slug());m.put("url","/seriler/"+s.slug());m.put("title",i.title());m.put("summary",i.summary());m.put("ongoing",i.ongoing());m.put("cover",i.cover().assetId()==null?null:media.publicProjection(i.cover().assetId()));var ids=repository.chapters(s.id(),true);m.put("chapterCount",ids.size());m.put("stats",Map.of("views",ids.stream().mapToLong(articles::views).sum(),"claps",ids.stream().mapToLong(id->articles.counts(id).claps()).sum(),"saves",ids.stream().mapToLong(id->articles.counts(id).saves()).sum()));return m;}
    private void validate(SeriesInput i){if(new HashSet<>(i.chapterIds()).size()!=i.chapterIds().size())throw new ApiException(409,"DUPLICATE_CHAPTER");if(i.cover().mode().equals("manual")!=(i.cover().assetId()!=null))throw new ApiException(422,"INVALID_COVER");if(i.cover().assetId()!=null)media.validate(Set.of(i.cover().assetId()),null,true);}
    private SeriesInput input(SeriesRepository.Stored s){return mapper.readValue(s.content(),SeriesInput.class);}
    private SeriesRepository.Stored require(UUID id){return repository.byId(id).orElseThrow(()->new ApiException(404,"NOT_FOUND"));}
    private void version(SeriesRepository.Stored s,long version){if(s.version()!=version)throw new ApiException(412,"STALE_VERSION");}
    private String query(String q){if(q==null)return null;q=q.trim();if(q.isEmpty()||q.length()>100)throw new ApiException(422,"INVALID_QUERY");return q;}
    private void bounds(int page,int size){if(page<0||page>1000||size<1||size>50)throw new ApiException(422,"INVALID_PAGINATION");}
    private Object page(Object items,int page,int size,long total,String sort){return Map.of("items",items,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort",sort);}
}
