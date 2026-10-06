package com.satir.identity.api;

import com.satir.identity.application.SessionManagementService;
import com.satir.identity.application.RateLimiter;
import com.satir.platform.ApiException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1")
public class SessionManagementController {
    private final SessionManagementService service;private final RateLimiter limiter;private final Clock clock;
    public SessionManagementController(SessionManagementService service,RateLimiter limiter,Clock clock){this.service=service;this.limiter=limiter;this.clock=clock;}
    public record PasswordInput(@NotBlank @Size(max=128) String password){}
    @PostMapping("/auth/reauthenticate") public Map<String,Object> reauthenticate(Authentication auth,@Valid @RequestBody PasswordInput input,HttpServletRequest request){
        if(auth==null)throw new ApiException(401,"SESSION_REQUIRED");
        limiter.check("reauth:"+auth.getName(),5,Duration.ofMinutes(15));
        long instant=service.reauthenticate(UUID.fromString(auth.getName()),input.password());request.changeSessionId();request.getSession().setAttribute("reauthenticatedAt",instant);
        return Map.of("validUntil",Instant.ofEpochMilli(instant+300000));
    }
    @GetMapping("/me/sessions") public Map<String,Object> sessions(Authentication auth,HttpServletRequest request){return Map.of("items",service.list(UUID.fromString(auth.getName()),request.getSession().getId()));}
    @DeleteMapping("/me/sessions/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(Authentication auth,@PathVariable UUID id,HttpServletRequest request){
        if(service.delete(UUID.fromString(auth.getName()),id,request.getSession().getId()))request.getSession().invalidate();
    }
    @PostMapping("/me/sessions/revoke-others") @ResponseStatus(HttpStatus.NO_CONTENT) public void revokeOthers(Authentication auth,HttpServletRequest request){
        Object at=request.getSession().getAttribute("reauthenticatedAt");if(!(at instanceof Long time)||clock.millis()-time>=300000)throw new ApiException(403,"REAUTHENTICATION_REQUIRED");
        service.revokeOthers(UUID.fromString(auth.getName()),request.getSession().getId());
    }
}
