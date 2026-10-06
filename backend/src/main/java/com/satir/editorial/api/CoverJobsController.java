package com.satir.editorial.api;
import com.satir.editorial.application.CoverRequests;
import com.satir.identity.application.RateLimiter;
import jakarta.validation.Valid;
import java.util.UUID;
import java.time.Duration;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/studio/cover-jobs")
public class CoverJobsController {
 private final CoverRequests covers;private final RateLimiter rates;
 public CoverJobsController(CoverRequests covers,RateLimiter rates){this.covers=covers;this.rates=rates;}
 @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.ACCEPTED) public Object create(Authentication auth,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody CoverRequests.Input input){rates.check("covers:"+auth.getName(),20,Duration.ofHours(1));return covers.create(UUID.fromString(auth.getName()),key,input);}
 @GetMapping("/{id}") public Object get(Authentication auth,@PathVariable UUID id){return covers.get(UUID.fromString(auth.getName()),id);}
}
