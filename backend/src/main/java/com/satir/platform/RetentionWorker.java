package com.satir.platform;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component
public class RetentionWorker {
 private final List<RetentionTask> tasks;
 public RetentionWorker(List<RetentionTask> tasks){this.tasks=tasks;}
 @Scheduled(fixedDelayString="${satir.retention-delay-ms:21600000}") public void clean(){for(var task:tasks)try{task.clean();}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(RetentionWorker.class).warn("RETENTION_FAILED module={}",task.getClass().getSimpleName());}}
}
