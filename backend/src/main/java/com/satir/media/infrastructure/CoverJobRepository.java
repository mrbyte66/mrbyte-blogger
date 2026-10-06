package com.satir.media.infrastructure;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository
public class CoverJobRepository {
 public record Job(UUID id,UUID owner,String query,String state,String candidates,String errorCode,Instant expiresAt){}
 private final JdbcClient jdbc;
 public CoverJobRepository(JdbcClient jdbc){this.jdbc=jdbc;}
 public void create(UUID id,UUID owner,String type,UUID resource,long version,String query,Instant now){jdbc.sql("insert into cover_job(id,owner_id,resource_type,resource_id,resource_version,query,state,created_at,expires_at) values (?,?,?,?,?,?,'PENDING',?,?)").params(id,owner,type,resource,version,query,Timestamp.from(now),Timestamp.from(now.plusSeconds(86400))).update();}
 public Optional<Job> find(UUID id){return jdbc.sql("select * from cover_job where id=?").param(id).query((r,n)->new Job(r.getObject("id",UUID.class),r.getObject("owner_id",UUID.class),r.getString("query"),r.getString("state"),r.getString("candidates"),r.getString("error_code"),r.getTimestamp("expires_at").toInstant())).optional();}
 public void ready(UUID id,String candidates){jdbc.sql("update cover_job set state='READY',candidates=?::jsonb,error_code=null where id=?").params(candidates,id).update();}
 public void failed(UUID id){jdbc.sql("update cover_job set state='FAILED',error_code='COVER_PROVIDER_FAILED' where id=?").param(id).update();}
}
