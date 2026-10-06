package com.satir.delivery.application;

import com.satir.delivery.infrastructure.OutboxRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
/** Enqueue participates in the caller's transaction; no provider IO occurs here. */
@Service
public class JobQueue {
    private final OutboxRepository repository;
    public JobQueue(OutboxRepository repository){this.repository=repository;}
    public void enqueue(String type,UUID aggregate,String key){repository.enqueue(type,aggregate,key);}
    public Object publications(int page,int size,String state,String query){if(page<0||page>1000||size<1||size>50)throw new com.satir.platform.ApiException(422,"INVALID_PAGINATION");if(state!=null&&!java.util.Set.of("PENDING","PROCESSING","SENT","SKIPPED","FAILED").contains(state))throw new com.satir.platform.ApiException(422,"INVALID_STATE");if(query!=null&&query.length()>100)throw new com.satir.platform.ApiException(422,"INVALID_SEARCH");return repository.publications(page,size,state,query==null||query.isBlank()?null:query.strip());}
    public Object retryPublication(UUID id,java.util.function.BiPredicate<UUID,String> eligibility){var job=repository.failedPublication(id).orElseThrow(()->new com.satir.platform.ApiException(409,"JOB_NOT_RETRYABLE"));repository.retry(id,eligibility.test(job.aggregateId(),job.key()));return java.util.Map.of("id",id);}
}
