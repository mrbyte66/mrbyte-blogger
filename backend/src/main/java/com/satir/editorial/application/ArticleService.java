package com.satir.editorial.application;


import com.satir.editorial.domain.PublicationState;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.platform.ApiException;
import com.satir.platform.IdempotentCommands;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class ArticleService {
    private final com.satir.media.application.MediaService media;private final SeriesService series;private final com.satir.editorial.infrastructure.EditorialWriteLock writeLock;private final ArticleRepository repository;private final ObjectMapper mapper;private final Clock clock;private final IdempotentCommands commands;private final ZoneId zone;private final com.satir.delivery.application.JobQueue jobs;
    public ArticleService(com.satir.media.application.MediaService media,SeriesService series,com.satir.editorial.infrastructure.EditorialWriteLock writeLock,ArticleRepository repository,ObjectMapper mapper,Clock clock,IdempotentCommands commands,com.satir.delivery.application.JobQueue jobs,@Value("${satir.time-zone}")String zone){this.media=media;this.series=series;this.writeLock=writeLock;this.repository=repository;this.mapper=mapper;this.clock=clock;this.commands=commands;this.jobs=jobs;this.zone=ZoneId.of(zone);}
    @Transactional public void importProvenance(UUID id,UUID source,Instant created){require(id,false);repository.importProvenance(id,source,created,clock.instant());}
    public boolean slugAvailable(String slug){return repository.slugAvailable(slug);}
    public Object ownerStats(int page,int size){pagination(page,size);var filter=new ArticleRepository.Filter(true,null,null,null,null,null,"date_desc");long total=repository.filteredCount(filter);var items=repository.filtered(filter,page,size).stream().map(a->{var counts=repository.counts(a.id());return Map.of("articleId",a.id(),"title",input(a).title(),"views",counts.views(),"claps",counts.claps(),"saves",counts.saves());}).toList();return Map.of("items",items,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort","date_desc");}
    public Map<String,Object> edit(UUID id){return editable(require(id,false));}
    public Object bySlug(String slug){
        var article=repository.bySlug(slug).orElseThrow(()->new ApiException(404,"NOT_FOUND"));
        if(!article.slug().equals(slug))return Map.of("resolution","redirect","canonicalPath","/yazilar/"+article.slug());
        var result=summary(article);var input=input(article);result.put("revisionId",article.revision());result.put("document",input.document());result.put("presentation",input.presentation());result.put("seo",input.seo());result.put("firstPublishedAt",article.firstPublished());result.put("publicModifiedAt",article.publicModified());result.put("series",series.navigation(article.id()));return result;
    }
    public Map<String,Object> list(int page,int size,String sort,boolean owner,String status,String visibility,UUID seriesId,UUID categoryId,String q){
        pagination(page,size);
        if(status!=null&&!java.util.Set.of("draft","scheduled","published","archived","trashed").contains(status))throw new ApiException(422,"INVALID_STATUS");
        if(visibility!=null&&!java.util.Set.of("public","private").contains(visibility))throw new ApiException(422,"INVALID_VISIBILITY");
        if(sort==null)sort="scheduled".equals(status)?"scheduled_asc":"date_desc";
        var allowed=owner?java.util.Set.of("date_desc","date_asc","created_asc","scheduled_asc","scheduled_desc","title_asc"):java.util.Set.of("date_desc","date_asc","title_asc");
        if(!allowed.contains(sort))throw new ApiException(422,"INVALID_SORT");
        if(q!=null){q=q.trim();if(q.isEmpty()||q.length()>100)throw new ApiException(422,"INVALID_QUERY");}
        var filter=new ArticleRepository.Filter(owner,status,visibility,seriesId,categoryId,q,sort);
        long total=repository.filteredCount(filter);
        var items=repository.filtered(filter,page,size).stream().map(owner?this::editable:this::summary).toList();
        return Map.of("items",items,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort",sort);
    }
    public JsonNode create(UUID owner,String key,ArticleInput request){
        return commands.execute(owner.toString(),"/studio/articles",key,request,()->{
            writeLock.acquire();var id=UUID.randomUUID();validate(request,false);
            String slug=request.slug()==null?slug(request.title(),id):request.slug();String visibility=request.visibility()==null?"public":request.visibility();
            if(!java.util.Set.of("public","private").contains(visibility))throw new ApiException(422,"INVALID_VISIBILITY");media.validate(assets(request),id,visibility.equals("public"));
            try{repository.create(id,owner,slug,visibility,request.displayDate()==null?LocalDate.now(clock.withZone(zone)):request.displayDate(),clock.instant());}
            catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"SLUG_CONFLICT");}
            writeRevision(id,request);repository.categories(id,request.categoryIds());series.placeArticle(id,request.seriesPlacement(),request.seriesVersions());return editable(require(id,false));
        });
    }
    @Transactional public Map<String,Object> update(UUID id,long version,ArticleInput request){
        writeLock.acquire();var stored=require(id,true);version(stored,version);validate(request,true);media.validate(assets(request),id,stored.visibility().equals("public"));
        if(stored.status().equals("scheduled")&&!stored.scheduled().isAfter(clock.instant()))throw new ApiException(409,"SCHEDULE_ALREADY_DUE");
        if(stored.status().equals("published"))validatePublishable(request);
        try{repository.reserveSlug(request.slug(),id);repository.save(id,request.slug(),request.displayDate(),clock.instant(),state(stored).publicReadable());}
        catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"SLUG_CONFLICT");}
        writeRevision(id,request);repository.categories(id,request.categoryIds());series.placeArticle(id,request.seriesPlacement(),request.seriesVersions());return editable(require(id,false));
    }
    public JsonNode action(UUID id,UUID owner,String key,long version,Action request){
        return commands.execute(owner.toString(),"/studio/articles/"+id+"/actions",key,Map.of("version",version,"action",request),()->{
            writeLock.acquire();var stored=require(id,true);version(stored,version);
            if(Boolean.TRUE.equals(request.publishSeries())&&!request.action().equals("publish"))throw new ApiException(422,"INVALID_PUBLISH_SERIES");
            var current=state(stored);var next=current.transition(request.action(),request.scheduledAt(),clock.instant());media.validate(assets(input(stored)),id,next.visibility().equals("public"));
            if(next.equals(current)){if(Boolean.TRUE.equals(request.publishSeries()))series.publishForArticle(id,request.seriesVersion());return editable(stored);}
            String scheduleZone=null;
            if(next.status().equals("scheduled")){try{scheduleZone=ZoneId.of(request.timeZone()).getId();}catch(java.time.DateTimeException|NullPointerException e){throw new ApiException(422,"INVALID_TIME_ZONE");}}
            if(java.util.Set.of("published","scheduled").contains(next.status()))validatePublishable(input(stored));
            repository.transition(id,next.status(),next.visibility(),next.scheduledAt(),scheduleZone,clock.instant(),next.status().equals("published")&&!current.status().equals("published"));
            if(Boolean.TRUE.equals(request.publishSeries()))series.publishForArticle(id,request.seriesVersion());
            if(next.status().equals("published")&&!current.status().equals("published"))enqueuePublication(require(id,false));
            return editable(require(id,false));
        });
    }
    @Transactional public void trash(UUID id,long version){
        writeLock.acquire();var found=repository.byId(id,true);if(found.isEmpty()||found.get().status().equals("trashed"))return;
        var stored=found.get();version(stored,version);repository.transition(id,"trashed",stored.visibility(),null,null,clock.instant(),false);
    }
    public List<UUID> due(){return repository.due(clock.instant());}
    @Transactional public void publishDue(UUID id){
        writeLock.acquire();var found=repository.byId(id,true);if(found.isEmpty())return;var stored=found.get();
        if(!stored.status().equals("scheduled")||!stored.visibility().equals("public")||stored.scheduled().isAfter(clock.instant()))return;
        validatePublishable(input(stored));media.validate(assets(input(stored)),id,true);repository.transition(id,"published","public",null,null,clock.instant(),true);enqueuePublication(require(id,false));
    }
    private void enqueuePublication(ArticleRepository.Stored article){jobs.enqueue("PUBLICATION",article.id(),"publication:"+article.id()+":"+article.generation());}
    public record Publication(UUID owner,String title,String path){}
    public java.util.Optional<Publication> publication(UUID id,String deliveryId){
        var article=repository.byId(id,false);if(article.isEmpty())return java.util.Optional.empty();var stored=article.get();
        if(!state(stored).publicReadable()||!deliveryId.equals("publication:"+id+":"+stored.generation()))return java.util.Optional.empty();
        return java.util.Optional.of(new Publication(stored.owner(),input(stored).title(),"/yazilar/"+stored.slug()));
    }
    public record Action(@jakarta.validation.constraints.NotBlank String action,Instant scheduledAt,String timeZone,Boolean publishSeries,Long seriesVersion){}
    private void validate(ArticleInput i,boolean updating){
        if(i.document()==null)throw new ApiException(422,"INVALID_DOCUMENT");i.document().validate();
        if(mapper.writeValueAsBytes(i.document()).length>1048576)throw new ApiException(413,"DOCUMENT_TOO_LARGE");
        if(updating&&(i.slug()==null||i.displayDate()==null||i.visibility()!=null))throw new ApiException(422,"INVALID_ARTICLE_WRITE");
        if(new java.util.HashSet<>(i.categoryIds()).size()!=i.categoryIds().size())throw new ApiException(422,"DUPLICATE_CATEGORY");
        for(var id:i.categoryIds())if(id==null||!repository.categoryExists(id))throw new ApiException(422,"INVALID_CATEGORY");
        if(i.cover().mode().equals("manual")!=(i.cover().assetId()!=null))throw new ApiException(422,"INVALID_COVER");
    }
    private java.util.Set<UUID> bodyAssets(ArticleInput input){var ids=new java.util.HashSet<UUID>();for(var block:input.document().blocks())if("image".equals(block.get("type")))ids.add(UUID.fromString(block.get("assetId").toString()));return ids;}
    private java.util.Set<UUID> assets(ArticleInput input){var ids=bodyAssets(input);if(input.cover().assetId()!=null)ids.add(input.cover().assetId());return ids;}
    private void writeRevision(UUID id,ArticleInput input){UUID revision=UUID.randomUUID();repository.revision(id,revision,mapper.writeValueAsString(input),clock.instant());repository.mediaRefs(id,revision,input.cover().assetId(),bodyAssets(input));}
    private void validatePublishable(ArticleInput i){validate(i,false);if(i.title().isBlank()||i.categoryIds().isEmpty()||!i.document().hasProse())throw new ApiException(422,"ARTICLE_NOT_PUBLISHABLE");}
    private ArticleRepository.Stored require(UUID id,boolean lock){return repository.byId(id,lock).orElseThrow(()->new ApiException(404,"NOT_FOUND"));}
    private PublicationState state(ArticleRepository.Stored s){return new PublicationState(s.status(),s.visibility(),s.scheduled());}
    private void version(ArticleRepository.Stored s,long requested){if(s.version()!=requested)throw new ApiException(412,"STALE_VERSION");}
    private ArticleInput input(ArticleRepository.Stored s){return mapper.readValue(s.content(),ArticleInput.class);}
    public LinkedHashMap<String,Object> summary(ArticleRepository.Stored s){
        var i=input(s);var m=new LinkedHashMap<String,Object>();m.put("id",s.id());m.put("slug",s.slug());m.put("url","/yazilar/"+s.slug());m.put("title",i.title());m.put("eyebrow",i.eyebrow());m.put("abstract",i.abstractText());
        String body=i.document().plainText();m.put("bodyPreview",preview(body));m.put("categories",repository.categories(s.id()).stream().map(c->Map.of("id",c.id(),"slug",c.slug(),"name",c.name())).toList());m.put("displayDate",s.displayDate());m.put("readingMinutes",Math.max(1,(body.trim().split("\\s+").length+199)/200));m.put("cover",i.cover().assetId()==null?null:media.publicProjection(i.cover().assetId()));m.put("stats",repository.counts(s.id()));return m;
    }
    private Map<String,Object> editable(ArticleRepository.Stored s){
        var m=new LinkedHashMap<String,Object>();mapper.convertValue(input(s),Map.class).forEach((k,v)->m.put(k.toString(),v));
        m.put("seriesPlacement",series.placement(s.id()));m.put("seriesVersions",List.of());m.put("id",s.id());m.put("slug",s.slug());m.put("version",s.version());m.put("status",s.status());m.put("visibility",s.visibility());m.put("displayDate",s.displayDate());m.put("createdAt",s.created());m.put("updatedAt",s.updated());m.put("scheduledAt",s.scheduled());m.put("scheduleZone",s.zone());m.put("firstPublishedAt",s.firstPublished());m.put("lastPublishedAt",s.lastPublished());m.put("revisionId",s.revision());return m;
    }
    private String slug(String title,UUID id){String normalized=java.text.Normalizer.normalize(title.toLowerCase(java.util.Locale.ROOT).replace('ı','i'),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").replaceAll("[^a-z0-9]+","-").replaceAll("^-|-$","");if(normalized.isBlank())return "draft-"+id;return normalized.length()>100?normalized.substring(0,100).replaceAll("-$",""):normalized;}
    private String preview(String body){if(body.length()<=200)return body;int end=200;while(end<body.length()&&end<2000&&!".!?…".contains(String.valueOf(body.charAt(end))))end++;return body.substring(0,Math.min(end+1,body.length()));}
    private void pagination(int page,int size){if(page<0||page>1000||size<1||size>50)throw new ApiException(422,"INVALID_PAGINATION");}
}
