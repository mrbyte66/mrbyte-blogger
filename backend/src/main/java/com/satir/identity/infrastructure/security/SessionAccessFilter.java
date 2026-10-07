package com.satir.identity.infrastructure.security;

import java.io.IOException;
import java.time.Clock;
import java.util.Optional;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.web.filter.OncePerRequestFilter;

import com.satir.identity.application.AccountAccess;
import com.satir.identity.application.SatirPrincipal;
import com.satir.identity.application.SessionPolicy;

/**
 * Runs before authorization for every request that carries a signed-in session:
 * <ul>
 *   <li>enforces the absolute session lifetime (idle expiry is enforced by Spring Session);</li>
 *   <li>re-reads the account so deletion ends the session and role/verification changes apply
 *       immediately. Authorities are never trusted from the stored session.</li>
 * </ul>
 */
class SessionAccessFilter extends OncePerRequestFilter {

    private final AccountAccess accountAccess;
    private final Clock clock;
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    SessionAccessFilter(AccountAccess accountAccess, Clock clock) {
        this.accountAccess = accountAccess;
        this.clock = clock;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = holder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof SatirPrincipal principal) {
            HttpSession session = request.getSession(false);
            Optional<AccountAccess.Grant> grant = withinAbsoluteLifetime(session)
                    ? accountAccess.current(principal.userId())
                    : Optional.empty();
            if (grant.isPresent()) {
                SecurityContext refreshed = holder.createEmptyContext();
                refreshed.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                        principal, null, grant.get().authorities()));
                holder.setContext(refreshed);
            } else {
                holder.clearContext();
                if (session != null) {
                    session.invalidate();
                }
            }
        }
        chain.doFilter(request, response);
    }

    private boolean withinAbsoluteLifetime(HttpSession session) {
        return session != null
                && session.getAttribute(SessionPolicy.ABSOLUTE_EXPIRY_ATTRIBUTE) instanceof Long expiresAt
                && clock.millis() < expiresAt;
    }
}
