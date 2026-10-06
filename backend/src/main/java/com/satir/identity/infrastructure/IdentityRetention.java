package com.satir.identity.infrastructure;
import com.satir.platform.RetentionTask;
import java.time.Clock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class IdentityRetention implements RetentionTask {
 private final JdbcClient jdbc;private final Clock clock;
 public IdentityRetention(JdbcClient jdbc,Clock clock){this.jdbc=jdbc;this.clock=clock;}
 @Transactional public void clean(){
  jdbc.sql("delete from auth_rate_bucket where expires_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(86400L))).update();
  jdbc.sql("delete from action_token where expires_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(86400L))).update();
  jdbc.sql("delete from google_attempt where expires_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(86400L))).update();
 }
}
