package com.satir.engagement.infrastructure;
import com.satir.platform.RetentionTask;
import java.time.Clock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class EngagementRetention implements RetentionTask {
 private final JdbcClient jdbc;private final Clock clock;
 public EngagementRetention(JdbcClient jdbc,Clock clock){this.jdbc=jdbc;this.clock=clock;}
 @Transactional public void clean(){
  var expired=jdbc.sql("select id from anonymous_actor where expires_at<? order by id limit 1000").param(java.sql.Timestamp.from(clock.instant())).query(java.util.UUID.class).list();
  for(var id:expired){String key=new com.satir.engagement.application.EngagementService.Actor(id,false).key();jdbc.sql("insert into engagement_lock values (?) on conflict do nothing").param(key).update();jdbc.sql("select actor_key_hash from engagement_lock where actor_key_hash=? for update").param(key).query(String.class).single();jdbc.sql("delete from anonymous_actor where id=? and expires_at<?").params(id,java.sql.Timestamp.from(clock.instant())).update();}
  jdbc.sql("delete from impression_receipt where received_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(2592000L))).update();
  jdbc.sql("delete from impression_page_receipt where received_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(2592000L))).update();
 }
}
