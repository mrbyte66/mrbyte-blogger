package com.satir.library.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class LibraryRepository implements com.satir.platform.AccountDataRemoval {
    private final JdbcClient jdbc;
    public LibraryRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public void removeFor(UUID user){lock(user);jdbc.sql("delete from bookmark where user_id=?").param(user).update();jdbc.sql("delete from collection where user_id=?").param(user).update();jdbc.sql("delete from library_lock where user_id=?").param(user).update();}
    public record Collection(UUID id,String name,boolean isDefault,long count,long version){}
    public record Saved(UUID articleId,UUID collectionId,Instant savedAt,long version){}
    public void lock(UUID user){jdbc.sql("insert into library_lock values (?) on conflict do nothing").param(user).update();jdbc.sql("select user_id from library_lock where user_id=? for update").param(user).query(UUID.class).single();}
    public Collection ensureDefault(UUID user){var found=jdbc.sql("select id from collection where user_id=? and is_default").param(user).query(UUID.class).optional();if(found.isEmpty())create(user,UUID.randomUUID(),"Genel","genel",true);return collections(user).stream().filter(Collection::isDefault).findFirst().orElseThrow();}
    public List<Collection> collections(UUID user){return jdbc.sql("select c.*, (select count(*) from bookmark b where b.user_id=c.user_id and b.collection_id=c.id) as count from collection c where user_id=? order by is_default desc,name collate satir_turkish,id").param(user).query((r,n)->new Collection(r.getObject("id",UUID.class),r.getString("name"),r.getBoolean("is_default"),r.getLong("count"),r.getLong("version"))).list();}
    public Optional<Collection> collection(UUID user,UUID id){return collections(user).stream().filter(c->c.id().equals(id)).findFirst();}
    public boolean collectionExists(UUID id){return jdbc.sql("select exists(select 1 from collection where id=?)").param(id).query(Boolean.class).single();}
    public void create(UUID user,UUID id,String name,String normalized,boolean isDefault){jdbc.sql("insert into collection(id,user_id,name,normalized_name,is_default) values (?,?,?,?,?)").params(id,user,name,normalized,isDefault).update();}
    public void rename(UUID user,UUID id,String name,String normalized){jdbc.sql("update collection set name=?,normalized_name=?,version=version+1 where user_id=? and id=?").params(name,normalized,user,id).update();}
    public void delete(UUID user,UUID id,UUID defaultId){jdbc.sql("update bookmark set collection_id=?,version=version+1 where user_id=? and collection_id=?").params(defaultId,user,id).update();jdbc.sql("delete from collection where user_id=? and id=?").params(user,id).update();}
    public Optional<Saved> saved(UUID user,UUID article){return jdbc.sql("select * from bookmark where user_id=? and article_id=?").params(user,article).query((r,n)->read(r)).optional();}
    private Saved read(java.sql.ResultSet r)throws java.sql.SQLException{return new Saved(r.getObject("article_id",UUID.class),r.getObject("collection_id",UUID.class),r.getTimestamp("saved_at").toInstant(),r.getLong("version"));}
    public void save(UUID user,UUID article,UUID collection,Instant now){jdbc.sql("insert into bookmark(user_id,article_id,collection_id,saved_at) values (?,?,?,?)").params(user,article,collection,Timestamp.from(now)).update();}
    public void move(UUID user,UUID article,UUID collection){jdbc.sql("update bookmark set collection_id=?,version=version+1 where user_id=? and article_id=?").params(collection,user,article).update();}
    public boolean remove(UUID user,UUID article){return jdbc.sql("delete from bookmark where user_id=? and article_id=?").params(user,article).update()>0;}
    public record Filter(UUID user,UUID collection,String q,String sort){}
    private JdbcClient.StatementSpec query(Filter f,String select,String tail){
        String where="b.user_id=:user"+(f.collection()==null?"":" and b.collection_id=:collection");
        if(f.q()!=null)where+=" and a.id is not null and (strpos(lower(a.title),lower(:q))>0 or strpos(lower(a.abstract),lower(:q))>0 or strpos(lower(a.category_names),lower(:q))>0)";
        var spec=jdbc.sql(select+" from bookmark b left join public_article_catalog a on a.id=b.article_id where "+where+tail).param("user",f.user());if(f.collection()!=null)spec=spec.param("collection",f.collection());if(f.q()!=null)spec=spec.param("q",f.q());return spec;
    }
    public List<Saved> list(Filter f,int page,int size){String sort=switch(f.sort()){
        case "saved_asc"->"b.saved_at asc,b.article_id asc";case "saved_desc"->"b.saved_at desc,b.article_id desc";
        case "date_desc"->"a.display_date desc nulls last,b.article_id";
        case "title_asc"->"a.title collate satir_turkish asc nulls last,b.article_id";
        default->throw new IllegalArgumentException("validated sort required");};
        return query(f,"select b.*"," order by "+sort+" limit :size offset :offset").param("size",size).param("offset",page*size).query((r,n)->read(r)).list();}
    public long count(Filter f){return query(f,"select count(*)","").query(Long.class).single();}
}
