package com.satir.engagement.api;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.satir.editorial.application.EditorialViews.ArticleStats;
import com.satir.engagement.application.EngagementService;
import com.satir.engagement.application.EngagementStats;
import com.satir.engagement.domain.EngagementRules.Actor;
import com.satir.identity.application.Authorities;
import com.satir.identity.application.SatirPrincipal;
import com.satir.platform.api.PageResponse;
import com.satir.platform.validation.ValidationException;

/**
 * Claps, views and public totals (API contract §6) plus the owner's read-only totals (§8).
 * A verified member reacts as their account; everyone else as a random anonymous cookie identity
 * (no fingerprinting). Anonymous claps are never merged into a member's on sign-in (Ü11).
 */
@RestController
@RequestMapping("/api/v1")
class EngagementController {

    record ClapRequest(Boolean clapped) {
    }

    record ImpressionRequest(UUID eventId, UUID articleId, String source, UUID pageViewId, Instant occurredAt) {
    }

    private final EngagementService engagement;
    private final EngagementStats stats;
    private final String cookieName;
    private final boolean cookieSecure;

    EngagementController(EngagementService engagement, EngagementStats stats,
            @Value("${satir.engagement.actor-cookie-name}") String cookieName,
            @Value("${satir.engagement.actor-cookie-secure}") boolean cookieSecure) {
        this.engagement = engagement;
        this.stats = stats;
        this.cookieName = cookieName;
        this.cookieSecure = cookieSecure;
    }

    /** Makes sure the browser has an anonymous identity (members react as their account). */
    @PostMapping("/engagement/session")
    Map<String, Boolean> session(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        actor(authentication, request, response, true);
        return Map.of("ready", true);
    }

    @GetMapping("/articles/{id}/my-clap")
    Map<String, Boolean> myClap(@PathVariable UUID id, Authentication authentication, HttpServletRequest request,
            HttpServletResponse response) {
        return Map.of("clapped", engagement.clapped(id, actor(authentication, request, response, false)));
    }

    @PutMapping("/articles/{id}/clap")
    EngagementService.ClapState clap(@PathVariable UUID id, @RequestBody ClapRequest body, Authentication authentication,
            HttpServletRequest request, HttpServletResponse response) {
        if (body.clapped() == null) {
            throw new ValidationException("clapped", "REQUIRED");
        }
        return engagement.setClap(id, actor(authentication, request, response, true), body.clapped());
    }

    @PostMapping("/impressions")
    EngagementService.ImpressionResult impression(@RequestBody ImpressionRequest body, Authentication authentication,
            HttpServletRequest request, HttpServletResponse response) {
        return engagement.impression(
                new EngagementService.Impression(body.eventId(), body.articleId(), body.source(), body.pageViewId(), body.occurredAt()),
                actor(authentication, request, response, false), request.getRemoteAddr(), request.getHeader(HttpHeaders.USER_AGENT));
    }

    @GetMapping("/articles/{id}/stats")
    ArticleStats articleStats(@PathVariable UUID id) {
        return stats.publicStats(id);
    }

    @GetMapping("/studio/article-stats")
    PageResponse<EngagementStats.OwnerArticleStats> ownerStats(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return stats.ownerStats(page, size);
    }

    private Actor actor(Authentication authentication, HttpServletRequest request, HttpServletResponse response,
            boolean create) {
        if (authentication != null && authentication.getPrincipal() instanceof SatirPrincipal principal
                && authentication.getAuthorities().stream().anyMatch(a -> Authorities.VERIFIED.equals(a.getAuthority()))) {
            return new Actor.Member(principal.userId());
        }
        Optional<UUID> existing = engagement.anonymousActor(cookie(request));
        if (existing.isPresent()) {
            return new Actor.Anonymous(existing.get());
        }
        if (!create) {
            return new Actor.None();
        }
        EngagementService.NewActor created = engagement.newAnonymousActor();
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(cookieName, created.cookieValue())
                .httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/").maxAge(created.lifetime()).build().toString());
        return new Actor.Anonymous(created.id());
    }

    private String cookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
