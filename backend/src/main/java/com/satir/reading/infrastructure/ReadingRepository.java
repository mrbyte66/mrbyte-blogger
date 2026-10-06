package com.satir.reading.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ReadingRepository implements com.satir.platform.AccountDataRemoval {
    private final JdbcClient jdbc;
    public ReadingRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Mark(UUID id,String kind,UUID revisionId,String fragments,String note,Instant createdAt,long version){}
    private Mark read(java.sql.ResultSet r)throws java.sql.SQLException{return new Mark(r.getObject("id",UUID.class),r.getString("kind"),r.getObject("revision_id",UUID.class),r.getString("fragments"),r.getString("note"),r.getTimestamp("created_at").toInstant(),r.getLong("version"));}
    public List<Mark> marks(UUID user,UUID article){return jdbc.sql("select * from annotation where user_id=? and article_id=? order by created_at,id").params(user,article).query((r,n)->read(r)).list();}
    public Optional<Mark> mark(UUID user,UUID article,UUID id){return jdbc.sql("select * from annotation where user_id=? and article_id=? and id=?").params(user,article,id).query((r,n)->read(r)).optional();}
    public void create(UUID user,UUID article,UUID id,String kind,UUID revision,String fragments,String note,Instant now){jdbc.sql("insert into annotation(id,user_id,article_id,revision_id,kind,fragments,note,created_at) values (?,?,?,?,?,?::jsonb,?,?)").params(id,user,article,revision,kind,fragments,note,Timestamp.from(now)).update();}
    public void update(UUID user,UUID article,UUID id,String kind,UUID revision,String fragments,String note){jdbc.sql("update annotation set kind=?,revision_id=?,fragments=?::jsonb,note=?,version=version+1 where user_id=? and article_id=? and id=?").params(kind,revision,fragments,note,user,article,id).update();}
    public boolean otherMark(UUID user,UUID article,UUID id){return jdbc.sql("select exists(select 1 from annotation where user_id<>? and article_id=? and id=?)").params(user,article,id).query(Boolean.class).single();}
    public void delete(UUID user,UUID article,UUID id){jdbc.sql("delete from annotation where user_id=? and article_id=? and id=?").params(user,article,id).update();}
    public Optional<String> receipt(UUID user,UUID event){return jdbc.sql("select request_hash from visit_receipt where user_id=? and event_id=?").params(user,event).query(String.class).optional();}
    public void visit(UUID user,UUID article,UUID event,String hash,Instant visited,Instant now){jdbc.sql("insert into visit_receipt values (?,?,?,?)").params(user,event,hash,Timestamp.from(now)).update();jdbc.sql("insert into article_visit values (?,?,?) on conflict(user_id,article_id) do update set last_visited_at=greatest(article_visit.last_visited_at,excluded.last_visited_at)").params(user,article,Timestamp.from(visited)).update();}
    public record Visit(UUID articleId,Instant lastVisitedAt){}
    public Optional<Instant> lastVisit(UUID user,UUID article){return jdbc.sql("select last_visited_at from article_visit where user_id=? and article_id=?").params(user,article).query(java.sql.Timestamp.class).optional().map(Timestamp::toInstant);}
    public List<Visit> history(UUID user,int page,int size){return jdbc.sql("select * from article_visit where user_id=? order by last_visited_at desc,article_id limit ? offset ?").params(user,size,page*size).query((r,n)->new Visit(r.getObject("article_id",UUID.class),r.getTimestamp("last_visited_at").toInstant())).list();}
    public long count(UUID user){return jdbc.sql("select count(*) from article_visit where user_id=?").param(user).query(Long.class).single();}
    public void clearHistory(UUID user){jdbc.sql("delete from article_visit where user_id=?").param(user).update();}
    public void removeFor(UUID user){clearHistory(user);jdbc.sql("delete from visit_receipt where user_id=?").param(user).update();jdbc.sql("delete from annotation where user_id=?").param(user).update();}
}
