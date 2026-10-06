package com.satir.site.application;
import com.satir.site.domain.ThemeDocument;
import com.satir.editorial.application.ArticleInput;
import com.satir.editorial.application.SeriesInput;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
/** Domain data only: no users, roles, credentials, counters or private member records. */
public record ArchiveManifest(int schemaVersion, Instant exportedAt, List<Category> categories,
 List<Article> articles, List<Series> series, ThemeDocument theme, List<Media> media) {
 public record Category(UUID id,String name,String slug){}
 public record Article(UUID id,Instant createdAt,ArticleInput input){}
 public record Series(UUID id,SeriesInput input){}
 public record Media(UUID id,String path,String sha256,Object attribution){}
}
