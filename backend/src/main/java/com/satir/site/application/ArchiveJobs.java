package com.satir.site.application;

import com.satir.delivery.application.JobHandler;
import com.satir.delivery.application.JobQueue;
import com.satir.editorial.application.EditorialCommands;
import com.satir.platform.*;
import com.satir.site.infrastructure.*;
import java.nio.file.Path;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

@Service
public class ArchiveJobs {
    private final ArchiveRepository repository;private final ArchiveStorage storage;private final ArchiveCodec codec;
    private final ArchiveData data;private final JobQueue queue;private final IdempotentCommands commands;
    private final EditorialCommands writes;private final ObjectMapper mapper;private final Clock clock;
    public ArchiveJobs(ArchiveRepository repository,ArchiveStorage storage,ArchiveCodec codec,ArchiveData data,JobQueue queue,IdempotentCommands commands,EditorialCommands writes,ObjectMapper mapper,Clock clock){this.repository=repository;this.storage=storage;this.codec=codec;this.data=data;this.queue=queue;this.commands=commands;this.writes=writes;this.mapper=mapper;this.clock=clock;}
    public Object export(UUID owner,String key){return commands.execute(owner.toString(),"/studio/exports",key,Map.of(),()->{UUID id=UUID.randomUUID();repository.create(id,owner,"EXPORT",null,clock.instant());queue.enqueue("ARCHIVE_EXPORT",id,"archive:export:"+id);return Map.of("id",id,"state","PENDING");});}
    public Object upload(UUID owner,String key,byte[] bytes){if(bytes.length>ArchiveCodec.MAX_COMPRESSED)throw new ApiException(413,"ARCHIVE_TOO_LARGE");return commands.execute(owner.toString(),"/studio/imports/validate",key,Map.of("sha256",ArchiveCodec.hash(bytes)),()->{UUID id=UUID.randomUUID();storage.write(id,bytes);TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){public void afterCompletion(int status){if(status!=STATUS_COMMITTED)storage.delete(id);}});repository.create(id,owner,"IMPORT",ArchiveCodec.hash(bytes),clock.instant());queue.enqueue("ARCHIVE_VALIDATE",id,"archive:validate:"+id);return Map.of("id",id,"state","PENDING");});}
    public Object get(UUID owner,UUID id,String kind){var job=require(owner,id,kind,false);var result=new LinkedHashMap<String,Object>();result.put("id",id);result.put("state",job.state());result.put("validationVersion",job.version());result.put("expiresAt",job.expiresAt());result.put("plan",mapper.readTree(job.result()));if(kind.equals("EXPORT")&&job.state().equals("READY"))result.put("downloadUrl","/api/v1/studio/exports/"+id+"/download");return result;}
    public Path download(UUID owner,UUID id){var job=require(owner,id,"EXPORT",false);if(!job.state().equals("READY"))throw new ApiException(409,"ARCHIVE_NOT_READY");return storage.read(id);}
    public Object commit(UUID owner,UUID id,String key,long version){return commands.execute(owner.toString(),"/studio/imports/"+id+"/commit",key,Map.of("validationVersion",version),()->{var job=require(owner,id,"IMPORT",true);if(job.version()!=version)throw new ApiException(412,"STALE_VERSION");if(!job.state().equals("READY"))throw new ApiException(409,"IMPORT_NOT_READY");repository.state(id,"COMMITTING",job.result());queue.enqueue("ARCHIVE_COMMIT",id,"archive:commit:"+id);return Map.of("id",id,"state","COMMITTING");});}
    private ArchiveRepository.Job require(UUID owner,UUID id,String kind,boolean lock){return repository.find(id,lock).filter(j->j.owner().equals(owner)&&j.kind().equals(kind)&&j.expiresAt().isAfter(clock.instant())).orElseThrow(()->new ApiException(404,"NOT_FOUND"));}
    /** Snapshot and import commands share the editorial transaction boundary. Provider/file reads never expose downloads. */
    @Transactional public boolean process(UUID id,String type){
        writes.acquire();var found=repository.find(id,true);if(found.isEmpty()||!found.get().expiresAt().isAfter(clock.instant()))return false;var job=found.get();
        if(type.equals("ARCHIVE_EXPORT")){if(!job.kind().equals("EXPORT")||!job.state().equals("PENDING"))return false;var snapshot=data.snapshot();storage.write(id,codec.encode(snapshot.manifest(),snapshot.media()));repository.state(id,"READY",mapper.writeValueAsString(Map.of("schemaVersion",1,"articles",snapshot.manifest().articles().size(),"series",snapshot.manifest().series().size())));return true;}
        byte[] bytes=storage.bytes(id);if(!Objects.equals(job.hash(),ArchiveCodec.hash(bytes)))throw new ApiException(422,"ARCHIVE_HASH_MISMATCH");
        if(type.equals("ARCHIVE_VALIDATE")){if(!job.kind().equals("IMPORT")||!job.state().equals("PENDING"))return false;var archive=codec.decode(bytes);data.validateFiles(archive);var plan=data.plan(archive.manifest());boolean valid=((List<?>)plan.get("errors")).isEmpty();repository.state(id,valid?"READY":"INVALID",mapper.writeValueAsString(plan));return true;}
        if(!type.equals("ARCHIVE_COMMIT")||!job.kind().equals("IMPORT")||!job.state().equals("COMMITTING"))return false;
        var result=data.restore(job.owner(),id,codec.decode(bytes));repository.state(id,"COMMITTED",mapper.writeValueAsString(result));return true;
    }
    @Transactional public void failed(UUID id,String code){var job=repository.find(id,true);if(job.isPresent()&&!Set.of("READY","COMMITTED","INVALID").contains(job.get().state()))repository.state(id,"FAILED",mapper.writeValueAsString(Map.of("errors",List.of(Map.of("code",code)))));}
}
