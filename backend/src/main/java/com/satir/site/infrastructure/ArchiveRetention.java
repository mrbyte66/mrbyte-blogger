package com.satir.site.infrastructure;
import com.satir.platform.RetentionTask;
import java.time.Clock;
import org.springframework.stereotype.Component;
@Component
public class ArchiveRetention implements RetentionTask {
 private final ArchiveRepository repository;private final ArchiveStorage storage;private final Clock clock;
 public ArchiveRetention(ArchiveRepository repository,ArchiveStorage storage,Clock clock){this.repository=repository;this.storage=storage;this.clock=clock;}
 @org.springframework.transaction.annotation.Transactional public void clean(){for(var id:repository.expired(clock.instant())){var job=repository.find(id,true);if(job.isPresent()&&!job.get().expiresAt().isAfter(clock.instant())){repository.delete(id);org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){public void afterCommit(){storage.delete(id);}});}}}
}
