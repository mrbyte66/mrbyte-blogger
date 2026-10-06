package com.satir.editorial.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SeriesRepository {
    private final JdbcClient jdbc;
    public SeriesRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Stored(UUID id,UUID owner,String slug,String content,String status,long version,Instant created,Instant updated){}
    private Stored read(java.sql.ResultSet r)throws java.sql.SQLException{
        return new Stored(r.getObject("id",UUID.class),r.getObject("owner_id",UUID.class),r.getString("slug"),r.getString("content"),r.getString("status"),r.getLong("version"),r.getTimestamp("created_at").toInstant(),r.getTimestamp("updated_at").toInstant());
    }
    private static final String PUBLIC="s.status='published' and exists(select 1 from series_chapter sc join article a on a.id=sc.article_id where sc.series_id=s.id and a.status='published' and a.visibility='public')";
    public Optional<Stored> byId(UUID id){return jdbc.sql("select * from series where id=?").param(id).query((r,n)->read(r)).optional();}
    public Optional<Stored> publicById(UUID id){return jdbc.sql("select s.* from series s where s.id=? and "+PUBLIC).param(id).query((r,n)->read(r)).optional();}
    public Optional<Stored> bySlug(String slug){return jdbc.sql("select s.* from series s join series_slug alias on alias.series_id=s.id where alias.slug=? and "+PUBLIC).param(slug).query((r,n)->read(r)).optional();}
    public void create(UUID id,UUID owner,String slug,String content,Instant now){jdbc.sql("insert into series(id,owner_id,slug,content,status,created_at,updated_at) values (?,?,?,?::jsonb,'draft',?,?)").params(id,owner,slug,content,Timestamp.from(now),Timestamp.from(now)).update();reserveSlug(slug,id);}
    public boolean slugAvailable(String slug){return jdbc.sql("select count(*) from series_slug where slug=?").param(slug).query(Integer.class).single()==0;}
    public void reserveSlug(String slug,UUID id){
        jdbc.sql("insert into series_slug values (?,?) on conflict do nothing").params(slug,id).update();
        if(!jdbc.sql("select series_id from series_slug where slug=?").param(slug).query(UUID.class).single().equals(id))throw new com.satir.platform.ApiException(409,"SLUG_CONFLICT");
    }
    public void save(UUID id,String slug,String content,Instant now){reserveSlug(slug,id);jdbc.sql("update series set slug=?,content=?::jsonb,version=version+1,updated_at=? where id=?").params(slug,content,Timestamp.from(now),id).update();}
    public void cover(UUID id,UUID asset){jdbc.sql("delete from series_media_ref where series_id=?").param(id).update();if(asset!=null)jdbc.sql("insert into series_media_ref values (?,?)").params(id,asset).update();}
    public void touch(UUID id,Instant now){jdbc.sql("update series set version=version+1,updated_at=? where id=?").params(Timestamp.from(now),id).update();}
    public void state(UUID id,String state,Instant now){jdbc.sql("update series set status=?,version=version+1,updated_at=? where id=?").params(state,Timestamp.from(now),id).update();}
    public List<UUID> chapters(UUID id,boolean publicOnly){return jdbc.sql("select sc.article_id from series_chapter sc join article a on a.id=sc.article_id where sc.series_id=?"+(publicOnly?" and a.status='published' and a.visibility='public'":"")+" order by sc.position").param(id).query(UUID.class).list();}
    public Optional<UUID> membership(UUID article){return jdbc.sql("select series_id from series_chapter where article_id=?").param(article).query(UUID.class).optional();}
    public void replaceChapters(UUID series,List<UUID> ids){if(ids.isEmpty())jdbc.sql("update series set status='draft' where id=?").param(series).update();jdbc.sql("delete from series_chapter where series_id=?").param(series).update();for(int n=0;n<ids.size();n++)jdbc.sql("insert into series_chapter values (?,?,?)").params(ids.get(n),series,n).update();}
    public void touchArticle(UUID id,Instant now){jdbc.sql("update article set version=version+1,updated_at=? where id=?").params(Timestamp.from(now),id).update();}
    public List<Stored> list(boolean owner,String status,String q,int page,int size){return query(owner,status,q,"select s.* from series s"," order by (s.content->>'title') collate satir_turkish,s.id limit :size offset :offset").param("size",size).param("offset",page*size).query((r,n)->read(r)).list();}
    public long count(boolean owner,String status,String q){return query(owner,status,q,"select count(*) from series s","").query(Long.class).single();}
    private JdbcClient.StatementSpec query(boolean owner,String status,String q,String select,String tail){
        String sql=select+" where "+(owner?"true":PUBLIC)+(status==null?"":" and s.status=:status")+(q==null?"":" and (strpos(lower(s.content->>'title'),lower(:q))>0 or strpos(lower(s.content->>'summary'),lower(:q))>0)");
        var spec=jdbc.sql(sql+tail);if(status!=null)spec=spec.param("status",status);if(q!=null)spec=spec.param("q",q);return spec;
    }
}
