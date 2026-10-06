package com.satir.editorial.application;
import com.satir.delivery.application.JobQueue;
import com.satir.platform.IdempotentCommands;
import java.util.UUID;
import org.springframework.stereotype.Service;
@Service
public class PublicationJobs {
 private final JobQueue queue;private final PublicationDelivery delivery;private final IdempotentCommands commands;private final EditorialCommands writes;
 public PublicationJobs(JobQueue queue,PublicationDelivery delivery,IdempotentCommands commands,EditorialCommands writes){this.queue=queue;this.delivery=delivery;this.commands=commands;this.writes=writes;}
 public Object list(int page,int size,String state,String query){return queue.publications(page,size,state,query);}
 public Object retry(UUID owner,UUID id,String key){return commands.execute(owner.toString(),"/studio/publication-jobs/"+id+"/retry",key,java.util.Map.of("id",id),()->{writes.acquire();return queue.retryPublication(id,delivery::eligible);});}
}
