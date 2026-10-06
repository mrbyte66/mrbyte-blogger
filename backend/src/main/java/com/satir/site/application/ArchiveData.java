package com.satir.site.application;

import com.satir.editorial.application.*;
import com.satir.media.application.MediaService;
import com.satir.platform.ApiException;
import com.satir.site.domain.ThemeDocument;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/** Maps archive IDs into new domain aggregates; never restores runtime identities or publish state. */
@Service
public class ArchiveData {
    private final ArticleService articles;
    private final SeriesService series;
    private final CategoryService categories;
    private final MediaService media;
    private final SiteService site;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final Clock clock;
    public ArchiveData(ArticleService articles,SeriesService series,CategoryService categories,MediaService media,SiteService site,ObjectMapper mapper,Validator validator,Clock clock){this.articles=articles;this.series=series;this.categories=categories;this.media=media;this.site=site;this.mapper=mapper;this.validator=validator;this.clock=clock;}

    public ArchiveCodec.Decoded snapshot(){
        var categoryTree=mapper.valueToTree(categories.list(true)).get("items");
        var exportedCategories=new ArrayList<ArchiveManifest.Category>();
        for(var c:categoryTree)exportedCategories.add(new ArchiveManifest.Category(UUID.fromString(c.get("id").asText()),c.get("name").asText(),c.get("slug").asText()));
        long manifestBytes=0;
        var exportedArticles=new ArrayList<ArchiveManifest.Article>();var exportedSeries=new ArrayList<ArchiveManifest.Series>();var assets=new LinkedHashSet<UUID>();
        for(int page=0;page<20;page++){
            var response=articles.list(page,50,"created_asc",true,null,null,null,null,null);
            for(var raw:(List<?>)response.get("items")){var record=mapper.valueToTree(raw);manifestBytes+=mapper.writeValueAsBytes(record).length;if(manifestBytes>15*1024*1024)throw new ApiException(413,"ARCHIVE_TOO_LARGE");UUID id=UUID.fromString(record.get("id").asText());var input=articleInput(record);exportedArticles.add(new ArchiveManifest.Article(id,Instant.parse(record.get("createdAt").asText()),input));assets.addAll(assetIds(input));}
            if(page+1>=((Number)response.get("totalPages")).intValue())break;if(page==19)throw new ApiException(413,"ARCHIVE_TOO_LARGE");
        }
        for(int page=0;page<4;page++){
            var response=mapper.valueToTree(series.list(true,null,null,page,50,"title_asc"));
            for(var raw:response.get("items")){UUID id=UUID.fromString(raw.get("id").asText());var record=mapper.valueToTree(series.edit(id));var input=seriesInput(record);exportedSeries.add(new ArchiveManifest.Series(id,input));if(input.cover().assetId()!=null)assets.add(input.cover().assetId());}
            if(page+1>=response.get("totalPages").asInt())break;if(page==3)throw new ApiException(413,"ARCHIVE_TOO_LARGE");
        }
        var files=new LinkedHashMap<String,byte[]>();var exportedMedia=new ArrayList<ArchiveManifest.Media>();long expanded=0;
        for(UUID id:assets){try{byte[] bytes=java.nio.file.Files.readAllBytes(media.read(id,true).path());expanded+=bytes.length;if(expanded>ArchiveCodec.MAX_EXPANDED)throw new ApiException(413,"ARCHIVE_TOO_LARGE");String path="media/"+id+".png";files.put(path,bytes);var details=mapper.valueToTree(media.ownerDetails(id));exportedMedia.add(new ArchiveManifest.Media(id,path,ArchiveCodec.hash(bytes),details.get("attribution")));}catch(java.io.IOException e){throw new ApiException(503,"MEDIA_STORAGE_UNAVAILABLE");}}
        var theme=mapper.convertValue(site.workspace().get("draft"),ThemeDocument.class);
        return new ArchiveCodec.Decoded(new ArchiveManifest(1,clock.instant(),exportedCategories,exportedArticles,exportedSeries,theme,exportedMedia),files);
    }
    private ArticleInput articleInput(tools.jackson.databind.JsonNode source){
        var node=mapper.createObjectNode();for(String key:List.of("title","slug","eyebrow","abstract","displayDate","categoryIds","document","presentation","seo","cover","visibility"))node.set(key,source.get(key));node.putNull("seriesPlacement");node.set("seriesVersions",mapper.createArrayNode());return mapper.treeToValue(node,ArticleInput.class);
    }
    private SeriesInput seriesInput(tools.jackson.databind.JsonNode source){var node=mapper.createObjectNode();for(String key:List.of("title","slug","summary","ongoing","cover","presentation","seo","chapterIds"))node.set(key,source.get(key));node.set("articleVersions",mapper.createArrayNode());return mapper.treeToValue(node,SeriesInput.class);}
    public void validateFiles(ArchiveCodec.Decoded archive){for(byte[] bytes:archive.media().values())media.validateArchiveImage(bytes);}
    public Map<String,Object> plan(ArchiveManifest manifest){
        var errors=new ArrayList<Map<String,String>>();
        try{validate(manifest);}catch(RuntimeException e){return Map.of("errors",List.of(Map.of("code","INVALID_MANIFEST")),"counts",Map.of());}
        var existing=mapper.valueToTree(categories.list(true)).get("items");
        for(var c:manifest.categories())for(var found:existing)if(found.get("slug").asText().equals(c.slug())&&!found.get("name").asText().equals(c.name()))errors.add(Map.of("code","CATEGORY_CONFLICT","slug",c.slug()));
        for(var a:manifest.articles())if(!articles.slugAvailable(a.input().slug()))errors.add(Map.of("code","ARTICLE_SLUG_CONFLICT","slug",a.input().slug()));
        for(var s:manifest.series())if(!series.slugAvailable(s.input().slug()))errors.add(Map.of("code","SERIES_SLUG_CONFLICT","slug",s.input().slug()));
        return Map.of("errors",errors,"counts",Map.of("articles",manifest.articles().size(),"series",manifest.series().size(),"media",manifest.media().size(),"categories",manifest.categories().size()),"publishState","draft","indexingEnabled",false);
    }
    private void validate(ArchiveManifest m){
        if(m.categories()==null||m.categories().size()>1000||m.articles()==null||m.articles().size()>1000||m.series()==null||m.series().size()>200||m.theme()==null||m.exportedAt().isAfter(clock.instant().plusSeconds(300)))invalid();
        var categoryIds=new HashSet<UUID>();var categorySlugs=new HashSet<String>();var categoryNames=new HashSet<String>();for(var c:m.categories())if(c==null||c.id()==null||!categoryIds.add(c.id())||c.name()==null||c.name().isBlank()||c.name().length()>80||c.slug()==null||!c.slug().matches("[a-z0-9]+(-[a-z0-9]+)*")||c.slug().length()>100||!categorySlugs.add(c.slug())||!categoryNames.add(c.name()))invalid();
        var articleIds=new HashSet<UUID>();var articleSlugs=new HashSet<String>();var mediaIds=new HashSet<UUID>();for(var asset:m.media()){mediaIds.add(asset.id());attribution(asset.attribution());}
        for(var a:m.articles()){
            if(a==null||a.id()==null||!articleIds.add(a.id())||a.createdAt()==null||a.createdAt().isAfter(clock.instant().plusSeconds(300))||a.createdAt().isBefore(Instant.parse("1900-01-01T00:00:00Z"))||a.input()==null||!validator.validate(a.input()).isEmpty())invalid();var i=a.input();i.document().validate();
            if(i.slug()==null||!articleSlugs.add(i.slug())||i.seriesPlacement()!=null||!i.seriesVersions().isEmpty()||!categoryIds.containsAll(i.categoryIds())||!mediaIds.containsAll(assetIds(i))||!Set.of("public","private").contains(i.visibility())||i.cover().mode().equals("manual")!=(i.cover().assetId()!=null))invalid();
        }
        var seriesIds=new HashSet<UUID>();var seriesSlugs=new HashSet<String>();var chapterMembership=new HashSet<UUID>();
        for(var s:m.series()){if(s==null||s.id()==null||!seriesIds.add(s.id())||s.input()==null||!validator.validate(s.input()).isEmpty())invalid();var i=s.input();if(!seriesSlugs.add(i.slug())||!i.articleVersions().isEmpty()||!articleIds.containsAll(i.chapterIds())||i.cover().mode().equals("manual")!=(i.cover().assetId()!=null)||i.cover().assetId()!=null&&!mediaIds.contains(i.cover().assetId()))invalid();for(UUID chapter:i.chapterIds())if(!chapterMembership.add(chapter))invalid();}
        m.theme().validate(false);
        for(var b:m.theme().blocks()){reference(b,"featuredArticleId",articleIds);reference(b,"featuredSeriesId",seriesIds);reference(b,"categoryId",categoryIds);}
        // A single file cannot become both a private article asset and a public article/series asset.
        var privateAssets=new HashSet<UUID>();var publicAssets=new HashSet<UUID>();for(var a:m.articles())(a.input().visibility().equals("private")?privateAssets:publicAssets).addAll(assetIds(a.input()));for(var s:m.series())if(s.input().cover().assetId()!=null)publicAssets.add(s.input().cover().assetId());privateAssets.retainAll(publicAssets);if(!privateAssets.isEmpty())invalid();
    }
    private void attribution(Object value){if(value==null||mapper.valueToTree(value).isNull())return;var node=mapper.valueToTree(value);if(!node.isObject()||node.size()>6||mapper.writeValueAsBytes(value).length>4096||!"pexels".equals(node.path("provider").asText())||!node.path("sourceUrl").asText().matches("https://www\\.pexels\\.com/[^\\s]*")||!node.path("licenseUrl").asText().equals("https://www.pexels.com/license/")||node.path("photographer").asText().length()>200)invalid();}
    private void reference(Map<String,Object>b,String key,Set<UUID> ids){if(b.get(key)!=null&&!ids.contains(UUID.fromString(b.get(key).toString())))invalid();}
    private Set<UUID> assetIds(ArticleInput input){var ids=new HashSet<UUID>();if(input.cover().assetId()!=null)ids.add(input.cover().assetId());for(var block:input.document().blocks())if(block.get("type").equals("image"))ids.add(UUID.fromString(block.get("assetId").toString()));return ids;}
    public Map<String,Object> restore(UUID owner,UUID job,ArchiveCodec.Decoded archive){
        var manifest=archive.manifest();var plan=plan(manifest);if(!((List<?>)plan.get("errors")).isEmpty())throw new ApiException(409,"IMPORT_CONFLICT");
        var mediaIds=new HashMap<UUID,UUID>();for(var item:manifest.media()){var uploaded=mapper.valueToTree(media.importImage(owner,key(job,"media",item.id()),archive.media().get(item.path())));var id=UUID.fromString(uploaded.get("id").asText());mediaIds.put(item.id(),id);if(item.attribution()!=null)media.setAttribution(id,item.attribution());}
        var categoryIds=new HashMap<UUID,UUID>();var current=mapper.valueToTree(categories.list(true)).get("items");for(var item:manifest.categories()){UUID found=null;for(var c:current)if(c.get("slug").asText().equals(item.slug()))found=UUID.fromString(c.get("id").asText());if(found==null)found=UUID.fromString(mapper.valueToTree(categories.create(owner.toString(),key(job,"category",item.id()),item.name(),item.slug())).get("id").asText());categoryIds.put(item.id(),found);}
        var articleIds=new HashMap<UUID,UUID>();for(var item:manifest.articles()){
            var i=item.input();var blocks=new ArrayList<Map<String,Object>>();for(var block:i.document().blocks()){var b=new LinkedHashMap<>(block);if(b.get("type").equals("image"))b.put("assetId",mediaIds.get(UUID.fromString(b.get("assetId").toString())).toString());blocks.add(b);}
            var input=new ArticleInput(i.title(),i.slug(),i.eyebrow(),i.abstractText(),i.displayDate(),i.categoryIds().stream().map(categoryIds::get).toList(),new com.satir.editorial.domain.ContentDocument(1,blocks),i.presentation(),i.seo(),cover(i.cover(),mediaIds),null,List.of(),i.visibility());
            var result=articles.create(owner,key(job,"article",item.id()),input);UUID id=UUID.fromString(result.get("id").asText());articleIds.put(item.id(),id);articles.importProvenance(id,item.id(),item.createdAt());
        }
        var seriesIds=new HashMap<UUID,UUID>();for(var item:manifest.series()){
            var i=item.input();var chapters=i.chapterIds().stream().map(articleIds::get).toList();var versions=chapters.stream().map(id->new SeriesInput.Version(id,((Number)articles.edit(id).get("version")).longValue())).toList();
            var input=new SeriesInput(i.title(),i.slug(),i.summary(),i.ongoing(),cover(i.cover(),mediaIds),i.presentation(),i.seo(),chapters,versions);
            var result=mapper.valueToTree(series.create(owner,key(job,"series",item.id()),input));seriesIds.put(item.id(),UUID.fromString(result.get("id").asText()));
        }
        var blocks=new ArrayList<Map<String,Object>>();for(var original:manifest.theme().blocks()){var b=new LinkedHashMap<>(original);remap(b,"featuredArticleId",articleIds);remap(b,"featuredSeriesId",seriesIds);remap(b,"categoryId",categoryIds);blocks.add(b);}
        var t=manifest.theme();site.draft(((Number)site.workspace().get("version")).longValue(),new ThemeDocument(t.schemaVersion(),t.name(),t.siteName(),t.accent(),t.typography(),t.surface(),t.width(),t.spacing(),blocks));site.settings(((Number)((Map<?,?>)site.settings()).get("version")).longValue(),new SiteService.Patch(null,null,false));
        return Map.of("articleIds",articleIds,"seriesIds",seriesIds,"state","COMMITTED","indexingEnabled",false);
    }
    private void remap(Map<String,Object>b,String key,Map<UUID,UUID> mapping){if(b.get(key)!=null)b.put(key,mapping.get(UUID.fromString(b.get(key).toString())).toString());}
    private ArticleInput.Cover cover(ArticleInput.Cover value,Map<UUID,UUID> ids){return new ArticleInput.Cover(value.mode(),value.assetId()==null?null:ids.get(value.assetId()));}
    private static String key(UUID job,String type,UUID id){return UUID.nameUUIDFromBytes((job+":"+type+":"+id).getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();}
    private void invalid(){throw new ApiException(422,"INVALID_MANIFEST");}
}
