package com.satir.identity.infrastructure;
import com.satir.platform.ApiException;
import com.satir.platform.Problems;

import com.satir.identity.application.AccountService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class SecurityConfiguration {
    @Bean org.springframework.session.web.http.DefaultCookieSerializer sessionCookie(
        @org.springframework.beans.factory.annotation.Value("${server.servlet.session.cookie.name}") String name,
        @org.springframework.beans.factory.annotation.Value("${server.servlet.session.cookie.secure}") boolean secure) {
        if(name.startsWith("__Host-")&&!secure)throw new IllegalStateException("__Host- cookies require Secure; use satir-session-dev for local HTTP");
        var cookie=new org.springframework.session.web.http.DefaultCookieSerializer();
        cookie.setCookieName(name); cookie.setCookiePath("/"); cookie.setUseHttpOnlyCookie(true);
        cookie.setUseSecureCookie(secure); cookie.setSameSite("Lax"); return cookie;
    }
    @Bean SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication
    SecurityFilterChain security(HttpSecurity http,AccountService accounts,Clock clock,ObjectMapper mapper,SecurityContextRepository repository,@org.springframework.beans.factory.annotation.Value("${satir.public-origin}") String origin,GoogleOAuthConfiguration google) throws Exception {
        var tokens=new HttpSessionCsrfTokenRepository(); tokens.setHeaderName("X-CSRF-TOKEN");
        http.securityContext(c -> c.securityContextRepository(repository))
            .csrf(c -> c.csrfTokenRepository(tokens).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .headers(h -> h.frameOptions(f -> f.sameOrigin()))
            .requestCache(c -> c.disable()).formLogin(c -> c.disable()).httpBasic(c -> c.disable()).logout(c -> c.disable())
            .authorizeHttpRequests(a -> a.requestMatchers("/actuator/health/**","/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/studio/**").hasRole("OWNER")
                .requestMatchers("/api/v1/me/**").hasAuthority("VERIFIED")
                .requestMatchers("/api/v1/site","/api/v1/media/**","/api/v1/articles/**","/api/v1/categories","/api/v1/series/**","/api/v1/seo/urls","/api/v1/engagement/**","/api/v1/impressions").permitAll()
                .anyRequest().denyAll())
            .exceptionHandling(c -> c.authenticationEntryPoint((r,s,e) -> write(mapper,r,s,401,"SESSION_REQUIRED"))
                .accessDeniedHandler((r,s,e) -> write(mapper,r,s,403,e instanceof org.springframework.security.web.csrf.CsrfException?"CSRF_INVALID":"ACCESS_DENIED")))
            .addFilterBefore(new OncePerRequestFilter() {
                protected void doFilterInternal(HttpServletRequest r,HttpServletResponse s,FilterChain chain) throws ServletException,IOException {
                    r.setAttribute("requestId",UUID.randomUUID().toString());
                    s.setHeader("X-Request-ID",String.valueOf(r.getAttribute("requestId")));
                    s.setHeader("Cache-Control","private, no-store"); s.setHeader("X-Robots-Tag","noindex"); s.setHeader("Vary","Cookie");
                    if(!java.util.Set.of("GET","HEAD","OPTIONS").contains(r.getMethod())&&r.getHeader("Origin")!=null&&!r.getHeader("Origin").equals(origin.replaceAll("/$",""))){write(mapper,r,s,403,"ORIGIN_REJECTED");return;}
                    var auth=SecurityContextHolder.getContext().getAuthentication();
                    if(auth!=null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
                        try {
                            var account=accounts.require(UUID.fromString(auth.getName()));
                            var session=r.getSession(false); var started=session==null?null:session.getAttribute("authenticatedAt");
                            Object generation=session==null?null:session.getAttribute("authenticationGeneration");
                            if(!(generation instanceof Long value)||value!=account.authenticationGeneration())throw new ApiException(401,"SESSION_EXPIRED");
                            long absolute=account.owner()?28800000L:2592000000L;
                            if(!(started instanceof Long at) || clock.millis()-at>=absolute) throw new ApiException(401,"SESSION_EXPIRED");
                            var authorities=new java.util.ArrayList<SimpleGrantedAuthority>(); authorities.add(new SimpleGrantedAuthority("ROLE_"+account.role()));
                            if(account.active()) authorities.add(new SimpleGrantedAuthority("VERIFIED"));
                            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(account.id().toString(),null,authorities));
                        } catch(ApiException|IllegalArgumentException ex) { if(r.getSession(false)!=null) r.getSession(false).invalidate(); SecurityContextHolder.clearContext(); }
                        catch(org.springframework.dao.DataAccessException ex) { write(mapper,r,s,503,"DATABASE_UNAVAILABLE"); return; }
                    }
                    chain.doFilter(r,s);
                }
            },CsrfFilter.class);
        google.configure(http);
        return http.build();
    }
    private static void write(ObjectMapper mapper,HttpServletRequest r,HttpServletResponse s,int status,String code) throws IOException {
        s.setStatus(status); s.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        s.getWriter().write(mapper.writeValueAsString(Problems.body(status,code,String.valueOf(r.getAttribute("requestId")),List.of())));
    }
}
