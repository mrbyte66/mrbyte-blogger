package com.satir.site.api;
import com.satir.site.application.ArchiveJobs;
import com.satir.platform.ApiException;
import com.satir.identity.application.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController
@RequestMapping("/api/v1/studio")
public class ArchiveController {
 private final com.satir.site.application.ArchiveCapacity capacity;private final ArchiveJobs jobs;private final Clock clock;private final RateLimiter rates;
 public ArchiveController(com.satir.site.application.ArchiveCapacity capacity,ArchiveJobs jobs,Clock clock,RateLimiter rates){this.capacity=capacity;this.jobs=jobs;this.clock=clock;this.rates=rates;}
 private void recent(HttpServletRequest request){var session=request.getSession(false);Object at=session==null?null:session.getAttribute("reauthenticatedAt");if(!(at instanceof Long time)||clock.millis()-time>=300000)throw new ApiException(403,"REAUTHENTICATION_REQUIRED");}
 private UUID owner(Authentication auth){return UUID.fromString(auth.getName());}
 @PostMapping("/exports") @ResponseStatus(HttpStatus.ACCEPTED) public Object export(Authentication auth,HttpServletRequest request,@RequestHeader(value="Idempotency-Key",required=false)String key){recent(request);rates.check("archives:"+auth.getName(),5,Duration.ofHours(1));return jobs.export(owner(auth),key);}
 @GetMapping("/exports/{id}") public Object export(Authentication auth,@PathVariable UUID id){return jobs.get(owner(auth),id,"EXPORT");}
 @GetMapping("/exports/{id}/download") public ResponseEntity<FileSystemResource> download(Authentication auth,@PathVariable UUID id){return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).header("Content-Disposition","attachment; filename=\"satir-"+id+".zip\"").body(new FileSystemResource(jobs.download(owner(auth),id)));}
 @PostMapping(value="/imports/validate",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @ResponseStatus(HttpStatus.ACCEPTED) public Object validate(Authentication auth,@RequestHeader(value="Idempotency-Key",required=false)String key,@RequestPart("file")MultipartFile file)throws java.io.IOException{rates.check("archives:"+auth.getName(),5,Duration.ofHours(1));if(file.getSize()>com.satir.site.application.ArchiveCodec.MAX_COMPRESSED)throw new ApiException(413,"ARCHIVE_TOO_LARGE");capacity.acquire();try{return jobs.upload(owner(auth),key,file.getBytes());}finally{capacity.release();}}
 @GetMapping("/imports/{id}") public Object imported(Authentication auth,@PathVariable UUID id){return jobs.get(owner(auth),id,"IMPORT");}
 public record Commit(@PositiveOrZero long validationVersion){}
 @PostMapping("/imports/{id}/commit") @ResponseStatus(HttpStatus.ACCEPTED) public Object commit(Authentication auth,HttpServletRequest request,@PathVariable UUID id,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody Commit input){recent(request);return jobs.commit(owner(auth),id,key,input.validationVersion());}
}
