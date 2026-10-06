package com.satir.engagement.api;

import com.satir.engagement.application.EngagementService;
import com.satir.identity.application.RateLimiter;
import com.satir.platform.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class EngagementController {
    private final EngagementService service;
    private final RateLimiter rates;
    private final boolean secure;
    public EngagementController(EngagementService service,RateLimiter rates,@Value("${server.servlet.session.cookie.secure}")boolean secure){this.service=service;this.rates=rates;this.secure=secure;}
    private String cookieName(){return secure?"__Host-satir-actor":"satir-actor-dev";}
    private EngagementService.Actor actor(Authentication auth,HttpServletRequest request){
        if(auth!=null&&auth.isAuthenticated()){
            if(auth.getAuthorities().stream().noneMatch(a->a.getAuthority().equals("VERIFIED")))throw new ApiException(403,"EMAIL_VERIFICATION_REQUIRED");
            return new EngagementService.Actor(UUID.fromString(auth.getName()),true);
        }
        if(request.getCookies()==null)return null;return Arrays.stream(request.getCookies()).filter(c->c.getName().equals(cookieName())).findFirst().flatMap(c->service.anonymous(c.getValue())).orElse(null);
    }
    private EngagementService.Actor require(Authentication auth,HttpServletRequest request){var actor=actor(auth,request);if(actor==null)throw new ApiException(428,"ENGAGEMENT_SESSION_REQUIRED");return actor;}
    @PostMapping("/engagement/session") public Object start(Authentication auth,HttpServletRequest request,HttpServletResponse response){
        if(actor(auth,request)==null){rates.check("engagement-start:"+request.getRemoteAddr(),30,Duration.ofMinutes(15));var next=service.start();response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from(cookieName(),next.secret()).httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(Duration.ofDays(180)).build().toString());}return Map.of("ready",true);
    }
    @GetMapping("/articles/{id}/my-clap") public Object state(Authentication auth,HttpServletRequest request,@PathVariable UUID id){return service.state(id,actor(auth,request));}
    public record Clap(@NotNull Boolean clapped){}
    @PutMapping("/articles/{id}/clap") public Object clap(Authentication auth,HttpServletRequest request,@PathVariable UUID id,@Valid @RequestBody Clap input){var actor=require(auth,request);rates.check("clap:"+actor.key(),30,Duration.ofMinutes(1));return service.clap(id,actor,input.clapped());}
    @PostMapping("/impressions") public Object impression(Authentication auth,HttpServletRequest request,@RequestBody EngagementService.Impression event){
        String agent=Optional.ofNullable(request.getHeader("User-Agent")).orElse("").toLowerCase(Locale.ROOT);
        if(agent.matches(".*(bot|crawler|spider|slurp|headless).*"))throw new ApiException(422,"BOT_IMPRESSION_REJECTED");
        if(request.getHeader("Purpose")!=null||request.getHeader("Sec-Purpose")!=null)throw new ApiException(422,"PREFETCH_IMPRESSION_REJECTED");
        var actor=require(auth,request);rates.check("impression:"+actor.key(),120,Duration.ofMinutes(1));rates.check("impression-ip:"+request.getRemoteAddr(),600,Duration.ofMinutes(1));return service.impression(actor,event);
    }
    @GetMapping("/articles/{id}/stats") public Object stats(@PathVariable UUID id){return service.stats(id);}
}
