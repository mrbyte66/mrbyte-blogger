package com.satir.editorial.infrastructure;

import java.time.Instant;
import java.time.LocalDate;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ArticleRepository {
    private final JdbcClient jdbc;
    public ArticleRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Stored(UUID id,UUID owner,String slug,UUID revision,String status,String visibility,LocalDate displayDate,Instant created,Instant updated,Instant firstPublished,Instant lastPublished,Instant publicModified,Instant scheduled,String zone,long version,long generation,String content){}
    private static final String SELECT="select a.*,r.content::text from article a join article_revision r on r.id=a.current_revision_id ";
    private Stored read(java.sql.ResultSet r)throws java.sql.SQLException{
        return new Stored(r.getObject("id",UUID.class),r.getObject("owner_id",UUID.class),r.getString("slug"),r.getObject("current_revision_id",UUID.class),r.getString("status"),r.getString("visibility"),r.getObject("display_date",LocalDate.class),instant(r,"created_at"),instant(r,"updated_at"),instant(r,"first_published_at"),instant(r,"last_published_at"),instant(r,"public_modified_at"),instant(r,"scheduled_at"),r.getString("schedule_zone"),r.getLong("version"),r.getLong("publication_generation"),r.getString("content"));
    }
    private Instant instant(java.sql.ResultSet r,String field)throws java.sql.SQLException{var t=r.getTimestamp(field);return t==null?null:t.toInstant();}
    public Optional<Stored> byId(UUID id,boolean lock){return jdbc.sql(SELECT+"where a.id=?"+(lock?" for update of a":"")).param(id).query((r,n)->read(r)).optional();}
    public Optional<Stored> bySlug(String slug){return jdbc.sql(SELECT+"join article_slug s on s.article_id=a.id where s.slug=? and a.status='published' and a.visibility='public'").param(slug).query((r,n)->read(r)).optional();}
    public Optional<Stored> publicById(UUID id){return jdbc.sql(SELECT+"where a.id=? and a.status='published' and a.visibility='public'").param(id).query((r,n)->read(r)).optional();}
    public Optional<String> revisionContent(UUID article,UUID revision){return jdbc.sql("select content::text from article_revision where article_id=? and id=?").params(article,revision).query(String.class).optional();}
    public MapCounts counts(UUID id){return jdbc.sql("select t.views,(select count(*) from article_clap c where c.article_id=t.article_id) as claps,(select count(*) from bookmark b where b.article_id=t.article_id) as saves from article_totals t where t.article_id=?").param(id).query((r,n)->new MapCounts(r.getLong(1),r.getLong(2),r.getLong(3))).single();}
    public record MapCounts(long views,long claps,long saves){}
    public void create(UUID id,UUID owner,String slug,String visibility,LocalDate date,Instant now){
        jdbc.sql("insert into article(id,owner_id,slug,status,visibility,display_date,created_at,updated_at) values (?,?,?,'draft',?,?,?,?)").params(id,owner,slug,visibility,date,Timestamp.from(now),Timestamp.from(now)).update();
        reserveSlug(slug,id);jdbc.sql("insert into article_totals(article_id) values (?)").param(id).update();
    }
    public void importProvenance(UUID id,UUID source,Instant sourceCreated,Instant imported){jdbc.sql("insert into article_import_provenance values (?,?,?,?)").params(id,source,Timestamp.from(sourceCreated),Timestamp.from(imported)).update();}
    public boolean slugAvailable(String slug){return jdbc.sql("select count(*) from article_slug where slug=?").param(slug).query(Integer.class).single()==0;}
    public void reserveSlug(String slug,UUID id){
        var target=jdbc.sql("select article_id from article_slug where slug=?").param(slug).query(UUID.class).optional();
        if(target.isPresent()&&!target.get().equals(id))throw new org.springframework.dao.DuplicateKeyException("slug already reserved");
        jdbc.sql("insert into article_slug values (?,?) on conflict do nothing").params(slug,id).update();
        var reserved=jdbc.sql("select article_id from article_slug where slug=?").param(slug).query(UUID.class).single();
        if(!reserved.equals(id))throw new org.springframework.dao.DuplicateKeyException("slug already reserved");
    }
    public void revision(UUID article,UUID revision,String content,Instant now){
        jdbc.sql("insert into article_revision values (?,?,?::jsonb,?)").params(revision,article,content,Timestamp.from(now)).update();
        jdbc.sql("update article set current_revision_id=? where id=?").params(revision,article).update();
    }
    public void mediaRefs(UUID article,UUID revision,UUID cover,java.util.Set<UUID> body){if(cover!=null)jdbc.sql("insert into article_media_ref values (?,?,?,'COVER')").params(article,revision,cover).update();for(UUID asset:body)jdbc.sql("insert into article_media_ref values (?,?,?,'BODY')").params(article,revision,asset).update();}
    public void save(UUID id,String slug,LocalDate date,Instant now,boolean publicContent){
        jdbc.sql("update article set slug=?,display_date=?,updated_at=?,version=version+1,public_modified_at=case when ? then ? else public_modified_at end where id=?").params(slug,date,Timestamp.from(now),publicContent,Timestamp.from(now),id).update();
    }
    public boolean categoryExists(UUID id){return jdbc.sql("select exists(select 1 from category where id=?)").param(id).query(Boolean.class).single();}
    public void categories(UUID id,List<UUID> categories){jdbc.sql("delete from article_category where article_id=?").param(id).update();for(int i=0;i<categories.size();i++)jdbc.sql("insert into article_category values (?,?,?)").params(id,categories.get(i),i).update();}
    public record Category(UUID id,String slug,String name,long version){}
    public List<Category> categories(UUID article){return jdbc.sql("select c.* from category c join article_category ac on ac.category_id=c.id where ac.article_id=? order by ac.position").param(article).query((r,n)->new Category(r.getObject("id",UUID.class),r.getString("slug"),r.getString("name"),r.getLong("version"))).list();}
    public void incrementViews(UUID id){jdbc.sql("update article_totals set views=views+1 where article_id=?").param(id).update();}
    public long views(UUID id){return jdbc.sql("select views from article_totals where article_id=?").param(id).query(Long.class).single();}
    public List<UUID> due(Instant now){return jdbc.sql("select id from article where status='scheduled' and visibility='public' and scheduled_at<=? order by scheduled_at,id limit 50").param(Timestamp.from(now)).query(UUID.class).list();}
    public List<Stored> publicList(int page,int size,boolean asc){return jdbc.sql(SELECT+"where a.status='published' and a.visibility='public' order by a.display_date "+(asc?"asc":"desc")+",a.id "+(asc?"asc":"desc")+" limit ? offset ?").params(size,page*size).query((r,n)->read(r)).list();}
    public long publicCount(){return jdbc.sql("select count(*) from article where status='published' and visibility='public'").query(Long.class).single();}
    public List<Stored> ownerList(int page,int size,boolean asc){return jdbc.sql(SELECT+"order by a.display_date "+(asc?"asc":"desc")+",a.id "+(asc?"asc":"desc")+" limit ? offset ?").params(size,page*size).query((r,n)->read(r)).list();}
    public long totalCount(){return jdbc.sql("select count(*) from article").query(Long.class).single();}
    public record Filter(boolean owner,String status,String visibility,UUID seriesId,UUID categoryId,String q,String sort){}
    public List<Stored> filtered(Filter filter,int page,int size){
        String order=switch(filter.sort()){
            case "date_asc" -> "a.display_date asc,a.id asc";
            case "date_desc" -> "a.display_date desc,a.id desc";
            case "created_asc" -> "a.created_at asc,a.id asc";
            case "scheduled_asc" -> "a.scheduled_at asc nulls last,a.id asc";
            case "scheduled_desc" -> "a.scheduled_at desc nulls last,a.id desc";
            case "title_asc" -> "(r.content->>'title') collate satir_turkish,a.id asc";
            default -> throw new IllegalArgumentException("validated sort required");
        };
        return filteredQuery(filter,SELECT," order by "+order+" limit :size offset :offset").param("size",size).param("offset",page*size).query((r,n)->read(r)).list();
    }
    public long filteredCount(Filter filter){return filteredQuery(filter,"select count(*) from article a join article_revision r on r.id=a.current_revision_id ","").query(Long.class).single();}
    private JdbcClient.StatementSpec filteredQuery(Filter f,String select,String tail){
        String where=f.owner()?"true":"a.status='published' and a.visibility='public'";
        if(f.status()!=null)where+=" and a.status=:status";
        if(f.visibility()!=null)where+=" and a.visibility=:visibility";
        if(f.seriesId()!=null)where+=" and exists(select 1 from series_chapter sc where sc.article_id=a.id and sc.series_id=:series)";
        if(f.categoryId()!=null)where+=" and exists(select 1 from article_category ac where ac.article_id=a.id and ac.category_id=:category)";
        if(f.q()!=null)where+=" and (strpos(lower(r.content->>'title'),lower(:q))>0 or strpos(lower(r.content->>'abstract'),lower(:q))>0 or exists(select 1 from article_category ac join category c on c.id=ac.category_id where ac.article_id=a.id and strpos(lower(c.name),lower(:q))>0))";
        var spec=jdbc.sql(select+" where "+where+tail);
        if(f.status()!=null)spec=spec.param("status",f.status());if(f.visibility()!=null)spec=spec.param("visibility",f.visibility());if(f.seriesId()!=null)spec=spec.param("series",f.seriesId());if(f.categoryId()!=null)spec=spec.param("category",f.categoryId());if(f.q()!=null)spec=spec.param("q",f.q());return spec;
    }
    public void transition(UUID id,String status,String visibility,Instant scheduled,String zone,Instant now,boolean publishing){
        jdbc.sql("""
            update article set status=?,visibility=?,scheduled_at=?,schedule_zone=?,updated_at=?,version=version+1,schedule_generation=schedule_generation+1,
            first_published_at=case when ? then coalesce(first_published_at,?) else first_published_at end,
            last_published_at=case when ? then ? else last_published_at end,
            public_modified_at=case when ? then ? else public_modified_at end,
            publication_generation=publication_generation+case when ? then 1 else 0 end where id=?
            """).params(status,visibility,scheduled==null?null:Timestamp.from(scheduled),zone,Timestamp.from(now),publishing,Timestamp.from(now),publishing,Timestamp.from(now),publishing,Timestamp.from(now),publishing,id).update();
    }
}
