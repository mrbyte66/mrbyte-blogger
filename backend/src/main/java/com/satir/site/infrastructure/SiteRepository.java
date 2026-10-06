package com.satir.site.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SiteRepository {
    private final JdbcClient jdbc;
    public SiteRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Workspace(long version,UUID draftRevisionId,String draft,UUID appliedRevisionId,String applied){}
    public record Settings(long version,String authorPublicName,String seo,boolean indexingEnabled){}
    public Workspace workspace(){return jdbc.sql("select w.*,d.payload as draft,a.payload as applied from theme_workspace w join theme_revision d on d.id=w.draft_revision_id join theme_revision a on a.id=w.applied_revision_id where w.id=1").query((r,n)->new Workspace(r.getLong("version"),r.getObject("draft_revision_id",UUID.class),r.getString("draft"),r.getObject("applied_revision_id",UUID.class),r.getString("applied"))).single();}
    public Settings settings(){return jdbc.sql("select * from site_settings where id=1").query((r,n)->new Settings(r.getLong("version"),r.getString("author_public_name"),r.getString("seo"),r.getBoolean("indexing_enabled"))).single();}
    public void revision(UUID id,String json,Instant now){jdbc.sql("insert into theme_revision values (?,?::jsonb,?)").params(id,json,Timestamp.from(now)).update();}
    public void draft(UUID id){jdbc.sql("update theme_workspace set draft_revision_id=?,version=version+1 where id=1").param(id).update();}
    public void apply(UUID id){jdbc.sql("update theme_workspace set applied_revision_id=?,version=version+1 where id=1").param(id).update();}
    public void settings(String author,String seo,Boolean indexing,Instant now){jdbc.sql("update site_settings set author_public_name=coalesce(?,author_public_name),seo=coalesce(?::jsonb,seo),indexing_enabled=coalesce(?,indexing_enabled),version=version+1,updated_at=? where id=1").params(author,seo,indexing,Timestamp.from(now)).update();}
    public record Url(String path,Instant lastModified){}
    private static final String URLS="""
        select path,last_modified from editorial_indexable_urls
        union all
        select pages.path,greatest(settings.updated_at,r.created_at) from site_settings settings cross join (values('/'),('/yazilar'),('/seriler'),('/uyelik')) pages(path)
        join theme_workspace w on w.id=1 join theme_revision r on r.id=w.applied_revision_id
        where jsonb_array_length(r.payload->'blocks')>0 and (settings.seo->>'indexable')::boolean
        """;
    public List<Url> urls(int page,int size){return jdbc.sql("select * from ("+URLS+") urls order by path limit ? offset ?").params(size,page*size).query((r,n)->new Url(r.getString("path"),r.getTimestamp("last_modified").toInstant())).list();}
    public long countUrls(){return jdbc.sql("select count(*) from ("+URLS+") urls").query(Long.class).single();}
}
