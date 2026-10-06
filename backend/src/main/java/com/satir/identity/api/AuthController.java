package com.satir.identity.api;

import com.satir.identity.application.AccountService;
import com.satir.identity.application.RateLimiter;
import com.satir.platform.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AccountService accounts; private final RateLimiter limits; private final SecurityContextRepository contexts; private final Clock clock;private final com.satir.identity.application.BrowserSessions browserSessions;
    public AuthController(AccountService accounts,RateLimiter limits,SecurityContextRepository contexts,Clock clock,com.satir.identity.application.BrowserSessions browserSessions) { this.browserSessions=browserSessions; this.accounts=accounts;this.limits=limits;this.contexts=contexts;this.clock=clock; }
    public record Login(@NotBlank @Size(max=254) String identifier,@NotBlank @Size(max=128) String password) {}
    @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @PostMapping("/login") public ProfileResponse login(@Valid @RequestBody Login input,HttpServletRequest request,HttpServletResponse response) {
        limits.check("login:ip:"+request.getRemoteAddr(),30,Duration.ofMinutes(15));
        limits.check("login:identity:"+AccountService.normalize(input.identifier()),5,Duration.ofMinutes(15));
        var user=accounts.authenticate(input.identifier(),input.password());
        browserSessions.establish(user,false,request,response);
        return ProfileResponse.from(user);
    }
    @GetMapping("/session") public Map<String,Object> session(Authentication authentication,HttpServletRequest request) {
        if(authentication==null) return Map.of("authenticated",false);
        var user=accounts.require(UUID.fromString(authentication.getName()));
        var session=request.getSession(false);
        long started=(Long)session.getAttribute("authenticatedAt");
        long expiry=Math.min(started+(user.owner()?28800000L:2592000000L),clock.millis()+session.getMaxInactiveInterval()*1000L);
        return Map.of("authenticated",true,"profile",ProfileResponse.from(user),"expiresAt",java.time.Instant.ofEpochMilli(expiry));
    }
    @PostMapping("/session/renew") public Map<String,Object> renew(Authentication authentication,HttpServletRequest request) {
        if(authentication==null) throw new ApiException(401,"SESSION_REQUIRED"); return session(authentication,request);
    }
    @PostMapping("/logout") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request,HttpServletResponse response) {
        if(request.getSession(false)!=null) request.getSession(false).invalidate(); SecurityContextHolder.clearContext();
    }
}
