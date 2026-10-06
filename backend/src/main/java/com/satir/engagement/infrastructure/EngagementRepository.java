package com.satir.engagement.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class EngagementRepository implements com.satir.platform.AccountDataRemoval {
    private final JdbcClient jdbc;
    public EngagementRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public void removeFor(UUID user){String key=new com.satir.engagement.application.EngagementService.Actor(user,true).key();lock(key);jdbc.sql("delete from article_clap where user_id=?").param(user).update();jdbc.sql("delete from impression_receipt where actor_key_hash=?").param(key).update();jdbc.sql("delete from impression_page_receipt where actor_key_hash=?").param(key).update();jdbc.sql("delete from engagement_lock where actor_key_hash=?").param(key).update();}
    public Optional<UUID> anonymous(String hash,Instant now){return jdbc.sql("select id from anonymous_actor where secret_hash=? and expires_at>?").params(hash,Timestamp.from(now)).query(UUID.class).optional();}
    public UUID create(String hash,Instant expires){UUID id=UUID.randomUUID();jdbc.sql("insert into anonymous_actor values (?,?,?)").params(id,hash,Timestamp.from(expires)).update();return id;}
    public void lock(String actor){jdbc.sql("insert into engagement_lock values (?) on conflict do nothing").param(actor).update();jdbc.sql("select actor_key_hash from engagement_lock where actor_key_hash=? for update").param(actor).query(String.class).single();}
    public boolean clapped(UUID article,UUID actor,boolean member){return jdbc.sql("select exists(select 1 from article_clap where article_id=? and "+(member?"user_id":"anonymous_actor_id")+"=?)").params(article,actor).query(Boolean.class).single();}
    public void clap(UUID article,UUID actor,boolean member,boolean target,Instant now){String field=member?"user_id":"anonymous_actor_id";if(target)jdbc.sql("insert into article_clap(id,article_id,"+field+",created_at) values (?,?,?,?) on conflict do nothing").params(UUID.randomUUID(),article,actor,Timestamp.from(now)).update();else jdbc.sql("delete from article_clap where article_id=? and "+field+"=?").params(article,actor).update();}
    public long claps(UUID article){return jdbc.sql("select count(*) from article_clap where article_id=?").param(article).query(Long.class).single();}
    public Optional<String> event(UUID id){return jdbc.sql("select request_hash from impression_receipt where event_id=?").param(id).query(String.class).optional();}
    public boolean receipt(UUID id,UUID article,String actor,String source,UUID page,Instant occurred,Instant now,String hash){
        // Event IDs and logical page impressions have independent dedupe records.
        int inserted=jdbc.sql("insert into impression_receipt values (?,?,?,?,?,?,?,?) on conflict do nothing").params(id,article,actor,source,page,Timestamp.from(occurred),Timestamp.from(now),hash).update();
        if(inserted==0)return false;
        return jdbc.sql("insert into impression_page_receipt values (?,?,?,?,?) on conflict do nothing").params(actor,article,source,page,Timestamp.from(now)).update()>0;
    }

    public boolean active(java.util.UUID id,java.time.Instant now){return jdbc.sql("select exists(select 1 from anonymous_actor where id=? and expires_at>?)").params(id,java.sql.Timestamp.from(now)).query(Boolean.class).single();}
}
