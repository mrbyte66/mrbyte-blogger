package com.satir.editorial.infrastructure;

import com.satir.platform.AssetReferences;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class EditorialAssetRepository implements AssetReferences {
    private final JdbcClient jdbc;
    public EditorialAssetRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public boolean publiclyReferenced(UUID asset){return jdbc.sql("""
        select exists(select 1 from article_media_ref ref join article a on a.id=ref.article_id and a.current_revision_id=ref.revision_id where ref.asset_id=? and a.status='published' and a.visibility='public')
        or exists(select 1 from series_media_ref ref join series s on s.id=ref.series_id where ref.asset_id=? and s.status='published' and exists(select 1 from series_chapter sc join article a on a.id=sc.article_id where sc.series_id=s.id and a.status='published' and a.visibility='public'))
        """).params(asset,asset).query(Boolean.class).single();}
    public boolean referenced(UUID asset){return jdbc.sql("select exists(select 1 from article_media_ref where asset_id=?) or exists(select 1 from series_media_ref where asset_id=?)").params(asset,asset).query(Boolean.class).single();}
    public boolean privateElsewhere(UUID asset,UUID article){return jdbc.sql("select exists(select 1 from article_media_ref ref join article a on a.id=ref.article_id and a.current_revision_id=ref.revision_id where ref.asset_id=? and a.visibility='private' and (?::uuid is null or a.id<>?))").params(asset,article,article).query(Boolean.class).single();}
    public boolean publicElsewhere(UUID asset,UUID article){return jdbc.sql("select exists(select 1 from article_media_ref ref join article a on a.id=ref.article_id and a.current_revision_id=ref.revision_id where ref.asset_id=? and a.visibility='public' and (?::uuid is null or a.id<>?)) or exists(select 1 from series_media_ref where asset_id=?)").params(asset,article,article,asset).query(Boolean.class).single();}
}
