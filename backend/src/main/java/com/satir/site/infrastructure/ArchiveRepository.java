package com.satir.site.infrastructure;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository
public class ArchiveRepository {
 private final JdbcClient jdbc;
 public ArchiveRepository(JdbcClient jdbc){this.jdbc=jdbc;}
 public record Job(UUID id,UUID owner,String kind,String state,long version,String hash,String result,Instant expiresAt){}
 public void create(UUID id,UUID owner,String kind,String hash,Instant now){jdbc.sql("insert into domain_archive_job(id,owner_id,kind,state,sha256,created_at,expires_at) values (?,?,?,'PENDING',?,?,?)").params(id,owner,kind,hash,Timestamp.from(now),Timestamp.from(now.plusSeconds(86400))).update();}
 public Optional<Job> find(UUID id,boolean lock){return jdbc.sql("select * from domain_archive_job where id=?"+(lock?" for update":"")).param(id).query((r,n)->new Job(r.getObject("id",UUID.class),r.getObject("owner_id",UUID.class),r.getString("kind"),r.getString("state"),r.getLong("version"),r.getString("sha256"),r.getString("result"),r.getTimestamp("expires_at").toInstant())).optional();}
 public void state(UUID id,String state,String result){jdbc.sql("update domain_archive_job set state=?,result=?::jsonb,version=version+1 where id=?").params(state,result,id).update();}
 public List<UUID> expired(Instant now){return jdbc.sql("select id from domain_archive_job where expires_at<=? order by id limit 100").param(Timestamp.from(now)).query(UUID.class).list();}
 public void delete(UUID id){jdbc.sql("delete from domain_archive_job where id=?").param(id).update();}
}
