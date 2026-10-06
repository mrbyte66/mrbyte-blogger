package com.satir.media.api;

import com.satir.media.application.MediaService;
import com.satir.identity.application.RateLimiter;
import com.satir.platform.ApiException;
import java.io.IOException;
import java.time.Duration;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class MediaController {
    private final MediaService service;
    private final RateLimiter rates;
    public MediaController(MediaService service,RateLimiter rates){this.service=service;this.rates=rates;}
    @PostMapping(value="/studio/media",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<?> upload(Authentication auth,@RequestHeader(value="Idempotency-Key",required=false)String key,@RequestPart("file")MultipartFile file){if(file.getSize()>10*1024*1024)throw new ApiException(413,"IMAGE_TOO_LARGE");rates.check("upload:"+auth.getName(),10,Duration.ofMinutes(1));try{return ResponseEntity.accepted().body(service.upload(UUID.fromString(auth.getName()),key,file.getBytes()));}catch(IOException e){throw new ApiException(422,"INVALID_IMAGE");}}
    @GetMapping("/studio/media/{id}") public Object details(@PathVariable UUID id){return service.ownerDetails(id);}
    @DeleteMapping("/studio/media/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id){service.delete(id);}
    @GetMapping("/media/{id}") public ResponseEntity<?> file(Authentication auth,@PathVariable UUID id){boolean owner=auth!=null&&auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_OWNER"));var asset=service.read(id,owner);return ResponseEntity.ok().contentType(MediaType.parseMediaType(asset.mime())).contentLength(asset.size()).header("Content-Disposition","inline; filename=\"image.png\"").header("X-Content-Type-Options","nosniff").body(new FileSystemResource(asset.path()));}
}
