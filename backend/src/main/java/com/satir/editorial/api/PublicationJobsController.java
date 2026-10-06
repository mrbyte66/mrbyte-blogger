package com.satir.editorial.api;
import com.satir.editorial.application.PublicationJobs;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/studio/publication-jobs")
public class PublicationJobsController {
 private final PublicationJobs jobs;
 public PublicationJobsController(PublicationJobs jobs){this.jobs=jobs;}
 @GetMapping public Object list(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(required=false)String state,@RequestParam(required=false)String q){return jobs.list(page,size,state,q);}
 @PostMapping("/{id}/retry") public Object retry(Authentication auth,@PathVariable UUID id,@RequestHeader(value="Idempotency-Key",required=false)String key){return jobs.retry(UUID.fromString(auth.getName()),id,key);}
}
