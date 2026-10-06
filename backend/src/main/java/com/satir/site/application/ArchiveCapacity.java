package com.satir.site.application;
import com.satir.platform.ApiException;
import org.springframework.stereotype.Component;
/** One archive in memory per process; multipart bodies are spooled to disk by the servlet container. */
@Component
public class ArchiveCapacity {
 private final java.util.concurrent.Semaphore permit=new java.util.concurrent.Semaphore(1);
 public void acquire(){if(!permit.tryAcquire())throw new ApiException(429,"ARCHIVE_PROCESSOR_BUSY",30L);}
 public void release(){permit.release();}
}
