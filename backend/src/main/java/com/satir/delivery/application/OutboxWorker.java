package com.satir.delivery.application;

import com.satir.delivery.infrastructure.OutboxRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OutboxWorker {
    private final OutboxRepository repository;private final Map<String,JobHandler> handlers;
    public OutboxWorker(OutboxRepository repository,List<JobHandler> handlers) {this.repository=repository;this.handlers=handlers.stream().collect(Collectors.toMap(JobHandler::type,Function.identity()));}
    @Scheduled(fixedDelayString="${satir.delivery-delay-ms:15000}") public void runOne() {
        repository.claim().ifPresent(job -> {try {
            var handler=handlers.get(job.type());if(handler==null)throw new IllegalStateException("Unsupported delivery type");
            repository.complete(job,handler.handle(job.aggregateId(),job.key()));
        }catch(RuntimeException e){repository.fail(job);}});
    }
}
