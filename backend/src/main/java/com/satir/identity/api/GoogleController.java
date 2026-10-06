package com.satir.identity.api;

import com.satir.identity.application.*;
import com.satir.platform.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class GoogleController {
    private final GoogleAccounts accounts;private final GoogleProviderSettings settings;private final Clock clock;private final RateLimiter rates;
    public GoogleController(GoogleAccounts accounts,GoogleProviderSettings settings,Clock clock,RateLimiter rates){this.accounts=accounts;this.settings=settings;this.clock=clock;this.rates=rates;}
    public record Start(@NotNull @Size(max=100)String returnTo,@Pattern(regexp="login|reauth")String purpose){}
    public record Linking(@NotNull @Size(max=100)String returnTo){}
    @GetMapping("/auth/providers") public Object providers(){return Map.of("google",settings.configured());}
    @PostMapping("/auth/google/start") public Object start(@Valid @RequestBody Start input,Authentication auth,HttpServletRequest request){return begin(input.returnTo(),input.purpose()==null?"login":input.purpose(),auth,request);}
    @PostMapping("/me/connections/google/start") public Object link(@Valid @RequestBody Linking input,Authentication auth,HttpServletRequest request){recent(request);return begin(input.returnTo(),"link",auth,request);}
    private Object begin(String returnTo,String purpose,Authentication auth,HttpServletRequest request){
        if(!settings.configured())throw new ApiException(503,"GOOGLE_NOT_CONFIGURED");rates.check("google-start:"+request.getRemoteAddr(),20,Duration.ofMinutes(15));
        UUID user=auth==null?null:UUID.fromString(auth.getName());UUID attempt=accounts.start(user,purpose,returnTo);
        var session=request.getSession(true);session.setAttribute("googleAttempt",attempt);session.setAttribute("googleBoundUser",purpose.equals("login")?"":user.toString());session.setAttribute("googlePurpose",purpose);session.setAttribute("googleStartedAt",clock.millis());
        return Map.of("authorizationUrl","/api/v1/auth/google/authorize/google");
    }
    @GetMapping("/me/connections") public Object connections(Authentication auth){return Map.of("items",accounts.connections(UUID.fromString(auth.getName())));}
    @DeleteMapping("/me/connections/google") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) public void unlink(Authentication auth,HttpServletRequest request){recent(request);accounts.unlink(UUID.fromString(auth.getName()));}
    private void recent(HttpServletRequest request){var session=request.getSession(false);Object at=session==null?null:session.getAttribute("reauthenticatedAt");if(!(at instanceof Long time)||clock.millis()-time>=300000)throw new ApiException(403,"REAUTHENTICATION_REQUIRED");}
}
