package com.satir.reading.infrastructure;
import com.satir.platform.RetentionTask;
import java.time.Clock;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class ReadingRetention implements RetentionTask {
 private final JdbcClient jdbc;private final Clock clock;
 public ReadingRetention(JdbcClient jdbc,Clock clock){this.jdbc=jdbc;this.clock=clock;}
 @Transactional public void clean(){
  jdbc.sql("delete from article_visit where last_visited_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(15552000L))).update();
  jdbc.sql("delete from visit_receipt where received_at<?").param(java.sql.Timestamp.from(clock.instant().minusSeconds(2592000L))).update();
 }
}
