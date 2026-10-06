package com.satir.site.application;
import com.satir.delivery.application.JobHandler;
import com.satir.platform.ApiException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class ArchiveHandlers {
 @Bean JobHandler archiveExport(ArchiveJobs jobs,ArchiveCapacity capacity){return handler("ARCHIVE_EXPORT",jobs,capacity);}
 @Bean JobHandler archiveValidate(ArchiveJobs jobs,ArchiveCapacity capacity){return handler("ARCHIVE_VALIDATE",jobs,capacity);}
 @Bean JobHandler archiveCommit(ArchiveJobs jobs,ArchiveCapacity capacity){return handler("ARCHIVE_COMMIT",jobs,capacity);}
 private JobHandler handler(String type,ArchiveJobs jobs,ArchiveCapacity capacity){return new JobHandler(){public String type(){return type;}public boolean handle(java.util.UUID id,String key){capacity.acquire();try{return jobs.process(id,type);}catch(RuntimeException e){jobs.failed(id,e instanceof ApiException api?api.code():"ARCHIVE_PROCESSING_FAILED");return true;}finally{capacity.release();}}};}
}
