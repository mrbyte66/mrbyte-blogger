package com.satir.identity.infrastructure.security;

import java.time.Clock;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.savedrequest.NullRequestCache;

import com.satir.identity.application.AccountAccess;
import com.satir.identity.application.Authorities;
import com.satir.identity.application.SessionPolicy;

import tools.jackson.databind.json.JsonMapper;

/**
 * Cookie-session security for the whole API (architecture §5):
 * <ul>
 *   <li>Spring Session JDBC; opaque HttpOnly cookie; no JWT/bearer tokens.</li>
 *   <li>CSRF token in the session, sent back in {@code X-CSRF-TOKEN} for every unsafe method,
 *       including login and logout. Same-origin deployment: CORS is not enabled.</li>
 *   <li>Explicit allowlist; anything not listed is denied. Studio is OWNER-only and every
 *       private /me endpoint requires a verified account.</li>
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(SessionPolicy.class)
class SecurityConfig {

    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        HttpSessionCsrfTokenRepository repository = new HttpSessionCsrfTokenRepository();
        repository.setHeaderName("X-CSRF-TOKEN");
        return repository;
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    /** Applied on login: new session ID (fixation protection) and a fresh CSRF token. */
    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository csrfTokenRepository) {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(csrfTokenRepository)));
    }

    /** Absent in operator-command mode, which runs without a web server. */
    @Bean
    @ConditionalOnWebApplication
    SecurityFilterChain apiSecurity(HttpSecurity http, CsrfTokenRepository csrfTokenRepository,
            SecurityContextRepository securityContextRepository, AccountAccess accountAccess, Clock clock,
            JsonMapper json) throws Exception {
        ProblemSecurityResponses problems = new ProblemSecurityResponses(json);
        http
                .csrf(csrf -> csrf.csrfTokenRepository(csrfTokenRepository))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(problems)
                        .accessDeniedHandler(problems))
                .addFilterBefore(new SessionAccessFilter(accountAccess, clock), AuthorizationFilter.class)
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/site", "/api/v1/categories", "/api/v1/articles",
                                "/api/v1/articles/**", "/api/v1/series", "/api/v1/series/**", "/api/v1/seo/**",
                                "/api/v1/media/**").permitAll()
                        .requestMatchers("/api/v1/studio/**").hasAuthority(Authorities.OWNER)
                        .requestMatchers("/api/v1/me", "/api/v1/me/**").hasAuthority(Authorities.VERIFIED)
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().denyAll());
        return http.build();
    }
}
