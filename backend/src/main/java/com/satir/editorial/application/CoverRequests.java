package com.satir.editorial.application;
import com.satir.media.application.CoverJobs;
import com.satir.platform.*;
import java.util.*;
import org.springframework.stereotype.Service;
import jakarta.validation.constraints.*;
@Service
public class CoverRequests {
 public record Input(@NotNull @Pattern(regexp="article|series")String resourceType,@NotNull UUID resourceId,@PositiveOrZero long resourceVersion,@Size(max=100)String query){}
 private final ArticleService articles;private final SeriesService series;private final CoverJobs covers;private final IdempotentCommands commands;private final EditorialCommands writes;
 public CoverRequests(ArticleService articles,SeriesService series,CoverJobs covers,IdempotentCommands commands,EditorialCommands writes){this.articles=articles;this.series=series;this.covers=covers;this.commands=commands;this.writes=writes;}
 public Object create(UUID owner,String key,Input input){if(!covers.configured())throw new ApiException(503,"COVER_PROVIDER_UNAVAILABLE");return commands.execute(owner.toString(),"/studio/cover-jobs",key,input,()->{writes.acquire();var target=input.resourceType().equals("article")?articles.edit(input.resourceId()):series.edit(input.resourceId());if(((Number)target.get("version")).longValue()!=input.resourceVersion())throw new ApiException(412,"STALE_VERSION");var cover=(Map<?,?>)target.get("cover");if(!cover.get("mode").equals("auto"))throw new ApiException(409,"COVER_MODE_CONFLICT");boolean privateArticle="private".equals(target.get("visibility"));String query=input.query()==null?"":input.query().trim();if(query.isBlank()&&privateArticle)throw new ApiException(422,"PRIVATE_COVER_QUERY_REQUIRED");if(query.isBlank()){String title=String.valueOf(target.get("title"));query=title.substring(0,Math.min(title.length(),100));}if(query.isBlank())throw new ApiException(422,"COVER_QUERY_REQUIRED");return covers.create(owner,input.resourceType(),input.resourceId(),input.resourceVersion(),query);});}
 public Object get(UUID owner,UUID id){return covers.get(owner,id);}
}
