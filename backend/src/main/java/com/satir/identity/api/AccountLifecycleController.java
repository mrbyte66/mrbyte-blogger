package com.satir.identity.api;

import com.satir.identity.application.MembershipService;
import com.satir.identity.application.RateLimiter;
import com.satir.platform.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AccountLifecycleController {
    private final MembershipService membership;
    private final Clock clock;
    private final RateLimiter rates;
    public AccountLifecycleController(MembershipService membership,Clock clock,RateLimiter rates){this.membership=membership;this.clock=clock;this.rates=rates;}
    public record Password(@NotNull @Size(min=12,max=128)String password,@NotNull @Size(min=12,max=128)String passwordConfirmation){}
    public record Delete(@NotNull String confirmation){}
    private void recent(HttpServletRequest request){var session=request.getSession(false);Object at=session==null?null:session.getAttribute("reauthenticatedAt");if(!(at instanceof Long time)||clock.millis()-time>=300000)throw new ApiException(403,"REAUTHENTICATION_REQUIRED");}
    @PutMapping("/me/password") @ResponseStatus(HttpStatus.NO_CONTENT) public void password(Authentication auth,HttpServletRequest request,@Valid @RequestBody Password input){recent(request);membership.changePassword(UUID.fromString(auth.getName()),input.password(),input.passwordConfirmation());request.getSession().invalidate();}
    @PostMapping("/me/email-change") @ResponseStatus(HttpStatus.ACCEPTED) public Object email(Authentication auth,HttpServletRequest request,@Valid @RequestBody MembershipController.EmailInput input){recent(request);rates.check("email-change:"+auth.getName(),3,Duration.ofHours(1));membership.requestEmailChange(UUID.fromString(auth.getName()),input.email());return Map.of("message","E-postanı kontrol et");}
    @PostMapping("/auth/email-change/confirm") @ResponseStatus(HttpStatus.NO_CONTENT) public void confirm(HttpServletRequest request,@Valid @RequestBody MembershipController.TokenInput input){membership.confirm(input.token(),"EMAIL_CHANGE",null,null);if(request.getSession(false)!=null)request.getSession(false).invalidate();}
    @DeleteMapping("/me") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(Authentication auth,HttpServletRequest request,@Valid @RequestBody Delete input){recent(request);membership.deleteAccount(UUID.fromString(auth.getName()),input.confirmation());request.getSession().invalidate();}
}
