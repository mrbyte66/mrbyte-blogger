package com.satir.delivery.infrastructure;
import com.satir.platform.RetentionTask;
import java.time.Clock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class DeliveryRetention implements RetentionTask {
 private final JdbcClient jdbc;private final Clock clock;
 public DeliveryRetention(JdbcClient jdbc,Clock clock){this.jdbc=jdbc;this.clock=clock;}
 @Transactional public void clean(){
  jdbc.sql("delete from outbox_job where created_at<? and state in ('SENT','SKIPPED','FAILED')").param(java.sql.Timestamp.from(clock.instant().minusSeconds(7776000L))).update();
 }
}
