package com.satir.site.application;

import com.satir.editorial.application.*;

import com.satir.platform.ApiException;
import com.satir.platform.IdempotentCommands;
import com.satir.site.domain.ThemeDocument;
import com.satir.site.infrastructure.SiteRepository;
import java.time.Clock;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class SiteService {
    private final SiteRepository repository;
    private final PublicArticles articles;
    private final SeriesService series;
    private final CategoryService categories;
    private final EditorialCommands writeLock;
    private final IdempotentCommands commands;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final boolean deploymentIndexing;
    private final String origin;
    public SiteService(SiteRepository repository,PublicArticles articles,SeriesService series,CategoryService categories,EditorialCommands writeLock,IdempotentCommands commands,ObjectMapper mapper,Clock clock,@Value("${satir.indexing-enabled}")boolean deploymentIndexing,@Value("${satir.public-origin}")String origin){this.repository=repository;this.articles=articles;this.series=series;this.categories=categories;this.writeLock=writeLock;this.commands=commands;this.mapper=mapper;this.clock=clock;this.deploymentIndexing=deploymentIndexing;this.origin=origin.replaceAll("/$","");}
    public Object settings(){var s=repository.settings();return Map.of("version",s.version(),"authorPublicName",s.authorPublicName(),"seo",mapper.readTree(s.seo()),"indexingEnabled",s.indexingEnabled(),"canonicalOrigin",origin);}
    public record Patch(@jakarta.validation.constraints.Size(max=80) String authorPublicName,@jakarta.validation.Valid ArticleInput.Seo seo,Boolean indexingEnabled){}
    @Transactional public Object settings(long version,Patch patch){writeLock.acquire();var current=repository.settings();if(current.version()!=version)throw new ApiException(412,"STALE_VERSION");if(patch.authorPublicName()!=null&&(patch.authorPublicName().isBlank()||patch.authorPublicName().length()>80))throw new ApiException(422,"INVALID_SITE_SETTINGS");repository.settings(patch.authorPublicName(),patch.seo()==null?null:mapper.writeValueAsString(patch.seo()),patch.indexingEnabled(),clock.instant());return settings();}
    public Map<String,Object> workspace(){var w=repository.workspace();return Map.of("version",w.version(),"draftRevisionId",w.draftRevisionId(),"draft",mapper.readTree(w.draft()),"appliedRevisionId",w.appliedRevisionId(),"applied",mapper.readTree(w.applied()));}
    @Transactional public Object draft(long version,ThemeDocument theme){writeLock.acquire();var w=repository.workspace();version(w,version);theme.validate(false);size(theme);UUID id=UUID.randomUUID();repository.revision(id,mapper.writeValueAsString(theme),clock.instant());repository.draft(id);return workspace();}
    public Object apply(UUID owner,String key,long version,UUID revision){return commands.execute(owner.toString(),"/studio/theme/apply",key,Map.of("version",version,"draftRevisionId",revision),()->{
        writeLock.acquire();var w=repository.workspace();version(w,version);if(!w.draftRevisionId().equals(revision))throw new ApiException(409,"DRAFT_REVISION_MISMATCH");var theme=mapper.readValue(w.draft(),ThemeDocument.class);theme.validate(true);references(theme);repository.apply(revision);return workspace();
    });}
    public Object restore(UUID owner,String key,long version){return commands.execute(owner.toString(),"/studio/theme/restore",key,Map.of("version",version),()->{writeLock.acquire();var w=repository.workspace();version(w,version);UUID id=UUID.randomUUID();repository.revision(id,w.applied(),clock.instant());repository.draft(id);return workspace();});}
    public Object publicSite(){
        var w=repository.workspace();var settings=repository.settings();var theme=mapper.readValue(w.applied(),ThemeDocument.class);var blocks=new ArrayList<Map<String,Object>>();
        for(var original:theme.blocks()){
            var block=new LinkedHashMap<>(original);
            if("scene".equals(block.get("kind"))){
                UUID article=id(block.get("featuredArticleId")),selectedSeries=id(block.get("featuredSeriesId"));var resolvedArticle=Boolean.TRUE.equals(block.get("showFeaturedArticle"))&&article!=null?articles.find(article):Optional.<Map<String,Object>>empty();var resolvedSeries=Boolean.TRUE.equals(block.get("showFeaturedSeries"))&&selectedSeries!=null?series.publicSummary(selectedSeries):Optional.<Map<String,Object>>empty();
                block.put("featuredArticleId",resolvedArticle.isPresent()?article:null);block.put("featuredSeriesId",resolvedSeries.isPresent()?selectedSeries:null);block.put("featuredArticle",resolvedArticle.orElse(null));block.put("featuredSeries",resolvedSeries.orElse(null));
            }
            blocks.add(block);
        }
        var projected=new LinkedHashMap<String,Object>();mapper.convertValue(theme,Map.class).forEach((k,v)->projected.put(k.toString(),v));projected.put("blocks",blocks);
        return Map.of("theme",projected,"siteName",theme.siteName(),"authorPublicName",settings.authorPublicName(),"seo",mapper.readTree(settings.seo()),"indexingEnabled",deploymentIndexing&&settings.indexingEnabled(),"canonicalOrigin",origin);
    }
    public Object urls(int page,int size){if(page<0||page>1000||size<1||size>50)throw new ApiException(422,"INVALID_PAGINATION");boolean enabled=deploymentIndexing&&repository.settings().indexingEnabled();long total=enabled?repository.countUrls():0;return Map.of("items",enabled?repository.urls(page,size):List.of(),"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort","path_asc");}
    private void references(ThemeDocument theme){for(var b:theme.blocks()){
        if("scene".equals(b.get("kind"))){UUID article=id(b.get("featuredArticleId")),selectedSeries=id(b.get("featuredSeriesId"));if(Boolean.TRUE.equals(b.get("showFeaturedArticle"))&&(article==null||articles.find(article).isEmpty()))throw new ApiException(409,"FEATURED_ARTICLE_UNAVAILABLE");if(Boolean.TRUE.equals(b.get("showFeaturedSeries"))&&(selectedSeries==null||series.publicSummary(selectedSeries).isEmpty()))throw new ApiException(409,"FEATURED_SERIES_UNAVAILABLE");}
        if("articles".equals(b.get("kind"))&&b.get("categoryId")!=null&&!categories.exists(id(b.get("categoryId"))))throw new ApiException(409,"CATEGORY_UNAVAILABLE");
    }}
    private UUID id(Object value){return value==null?null:UUID.fromString(value.toString());}
    private void version(SiteRepository.Workspace w,long version){if(w.version()!=version)throw new ApiException(412,"STALE_VERSION");}
    private void size(Object theme){if(mapper.writeValueAsBytes(theme).length>262144)throw new ApiException(413,"THEME_TOO_LARGE");}
}
