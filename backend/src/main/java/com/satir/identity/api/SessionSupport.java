package com.satir.identity.api;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import com.satir.identity.application.AccountAccess;
import com.satir.identity.application.Authorities;
import com.satir.identity.application.SatirPrincipal;
import com.satir.identity.application.SessionPolicy;
import com.satir.identity.application.SessionRegistry;
import com.satir.platform.api.ApiException;

/** Establishes, inspects and ends server sessions for the HTTP layer. */
@Component
class SessionSupport {

    static final String REAUTH_ATTRIBUTE = "satir.reauthAt";
    static final Duration REAUTH_WINDOW = Duration.ofMinutes(5);

    private final SessionAuthenticationStrategy sessionStrategy;
    private final SecurityContextRepository contextRepository;
    private final SessionPolicy policy;
    private final SessionRegistry registry;
    private final Clock clock;
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    SessionSupport(SessionAuthenticationStrategy sessionStrategy, SecurityContextRepository contextRepository,
            SessionPolicy policy, SessionRegistry registry, Clock clock) {
        this.sessionStrategy = sessionStrategy;
        this.contextRepository = contextRepository;
        this.policy = policy;
        this.registry = registry;
        this.clock = clock;
    }

    /** Rotates the session ID and CSRF token, then stores only the account ID in the session. */
    void establish(AccountAccess.Grant grant, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                new SatirPrincipal(grant.userId()), null, grant.authorities());
        request.getSession(true);
        sessionStrategy.onAuthentication(authentication, request, response);

        SecurityContext context = holder.createEmptyContext();
        context.setAuthentication(authentication);
        holder.setContext(context);
        contextRepository.saveContext(context, request, response);

        HttpSession session = request.getSession();
        session.setMaxInactiveInterval(Math.toIntExact(policy.idle(grant.role()).toSeconds()));
        session.setAttribute(SessionPolicy.ABSOLUTE_EXPIRY_ATTRIBUTE,
                clock.instant().plus(policy.absolute(grant.role())).toEpochMilli());
        session.setAttribute(SessionRegistry.DEVICE_ATTRIBUTE, SessionRegistry.deviceLabel(request.getHeader("User-Agent")));
        session.removeAttribute(REAUTH_ATTRIBUTE);
    }

    void end(HttpServletRequest request) {
        holder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    /** Ends every session of the account. The current one (if it is theirs) is invalidated properly. */
    void endAllSessions(UUID userId, HttpServletRequest request) {
        HttpSession current = request.getSession(false);
        registry.revokeAllExcept(userId, current == null ? "" : current.getId());
        if (currentPrincipal().map(p -> p.userId().equals(userId)).orElse(false)) {
            end(request);
        }
    }

    Optional<SatirPrincipal> currentPrincipal() {
        Authentication authentication = holder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof SatirPrincipal principal
                ? Optional.of(principal)
                : Optional.empty();
    }

    boolean currentIsVerified() {
        Authentication authentication = holder.getContext().getAuthentication();
        return authentication != null
                && authentication.getAuthorities().stream().anyMatch(a -> Authorities.VERIFIED.equals(a.getAuthority()));
    }

    SatirPrincipal requireVerified() {
        SatirPrincipal principal = currentPrincipal().orElseThrow(SessionSupport::unauthenticated);
        if (!currentIsVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_VERIFICATION_REQUIRED", "Önce e-posta adresini doğrula");
        }
        return principal;
    }

    Instant markReauthenticated(HttpServletRequest request) {
        Instant now = clock.instant();
        request.getSession().setAttribute(REAUTH_ATTRIBUTE, now.toEpochMilli());
        return now.plus(REAUTH_WINDOW);
    }

    /** Sensitive actions (password, e-mail, login methods, deletion) need a re-auth within 5 minutes. */
    void requireRecentReauth(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        boolean recent = session != null && session.getAttribute(REAUTH_ATTRIBUTE) instanceof Long at
                && clock.millis() - at <= REAUTH_WINDOW.toMillis();
        if (!recent) {
            throw new ApiException(HttpStatus.FORBIDDEN, "REAUTH_REQUIRED", "Bu işlem için parolanı yeniden doğrula");
        }
    }

    String currentSessionId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return session == null ? null : session.getId();
    }

    /** The earlier of the idle deadline (from now) and the absolute deadline. */
    Optional<Instant> expiresAt(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute(SessionPolicy.ABSOLUTE_EXPIRY_ATTRIBUTE) instanceof Long absolute)) {
            return Optional.empty();
        }
        Instant idleDeadline = clock.instant().plusSeconds(session.getMaxInactiveInterval());
        Instant absoluteDeadline = Instant.ofEpochMilli(absolute);
        return Optional.of(idleDeadline.isBefore(absoluteDeadline) ? idleDeadline : absoluteDeadline);
    }

    static ApiException unauthenticated() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Giriş yapman gerekiyor");
    }
}
