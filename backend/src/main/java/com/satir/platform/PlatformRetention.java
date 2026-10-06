package com.satir.platform;
import com.satir.platform.RetentionTask;
import java.time.Clock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class PlatformRetention implements RetentionTask {
 private final JdbcClient jdbc;private final Clock clock;
 public PlatformRetention(JdbcClient jdbc,Clock clock){this.jdbc=jdbc;this.clock=clock;}
 @Transactional public void clean(){
  jdbc.sql("delete from idempotency_record where expires_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(0L))).update();
 }
}
