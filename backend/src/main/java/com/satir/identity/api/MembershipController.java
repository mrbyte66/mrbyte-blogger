package com.satir.identity.api;

import com.satir.identity.application.AccountService;
import com.satir.identity.application.MembershipService;
import com.satir.identity.application.RateLimiter;
import com.satir.platform.Preconditions;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class MembershipController {
    private final MembershipService membership;private final AccountService accounts;private final RateLimiter limits;
    public MembershipController(MembershipService membership,AccountService accounts,RateLimiter limits){this.membership=membership;this.accounts=accounts;this.limits=limits;}
    public record Registration(@NotBlank @Size(max=80) String name,@NotBlank @Email @Size(max=254) String email,@NotNull @Size(min=12,max=128) String password,@NotNull @Size(min=12,max=128) String passwordConfirmation){}
    public record EmailInput(@NotBlank @Email @Size(max=254) String email){}
    public record TokenInput(@NotBlank @Size(max=512) String token){}
    public record ResetInput(@NotBlank @Size(max=512) String token,@NotNull @Size(min=12,max=128) String password,@NotNull @Size(min=12,max=128) String passwordConfirmation){}
    public record ProfilePatch(@Size(min=1,max=80) String name,@Size(max=60) String avatar){}
    public record PreferencePatch(Boolean publicationEmail,@Size(max=80) String timeZone){}
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String,String> register(@Valid @RequestBody Registration input,HttpServletRequest r){rate(input.email(),r);membership.register(input.name(),input.email(),input.password(),input.passwordConfirmation());return accepted();}
    @PostMapping("/auth/verification/resend") @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String,String> resend(@Valid @RequestBody EmailInput input,HttpServletRequest r){rate(input.email(),r);membership.requestToken(input.email(),"VERIFY");return accepted();}
    @PostMapping("/auth/password/forgot") @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String,String> forgot(@Valid @RequestBody EmailInput input,HttpServletRequest r){rate(input.email(),r);membership.requestToken(input.email(),"RESET");return accepted();}
    @PostMapping("/auth/verification/confirm") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody TokenInput input){membership.confirm(input.token(),"VERIFY",null,null);}
    @PostMapping("/auth/password/reset") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@Valid @RequestBody ResetInput input,HttpServletRequest r){membership.confirm(input.token(),"RESET",input.password(),input.passwordConfirmation());if(r.getSession(false)!=null)r.getSession(false).invalidate();}
    @GetMapping("/me") public ProfileResponse me(Authentication auth){return ProfileResponse.from(accounts.require(UUID.fromString(auth.getName())));}
    @PatchMapping("/me") public ProfileResponse profile(Authentication auth,@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody ProfilePatch patch){return ProfileResponse.from(membership.profile(UUID.fromString(auth.getName()),Preconditions.version(version),patch.name(),patch.avatar(),null,null));}
    @PatchMapping("/me/preferences") public ProfileResponse preferences(Authentication auth,@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody PreferencePatch patch){return ProfileResponse.from(membership.profile(UUID.fromString(auth.getName()),Preconditions.version(version),null,null,patch.publicationEmail(),patch.timeZone()));}
    private void rate(String email,HttpServletRequest request){limits.check("account:ip:"+request.getRemoteAddr(),3,Duration.ofHours(1));limits.check("account:email:"+AccountService.normalize(email),3,Duration.ofHours(1));}
    private Map<String,String> accepted(){return Map.of("message","E-postanı kontrol et");}
}
