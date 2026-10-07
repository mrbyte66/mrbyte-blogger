package com.satir.identity.application;

import java.time.Duration;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

import com.satir.identity.domain.EmailAddress;
import com.satir.identity.infrastructure.security.SatirUserDetails;
import com.satir.platform.api.ApiException;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.ratelimit.RateLimiter;

/**
 * Password login with abuse limits (architecture §5: 5 failures / 15 min per identifier and
 * 30 / 15 min per client address). Failures are generic so the response never reveals whether an
 * account exists. A successful login does not wipe recorded failures.
 */
@Service
public class LoginService {

    static final RateLimiter.Limit PER_IDENTIFIER = new RateLimiter.Limit("login-identifier", 5, Duration.ofMinutes(15));
    static final RateLimiter.Limit PER_CLIENT = new RateLimiter.Limit("login-client", 30, Duration.ofMinutes(15));

    private final AuthenticationManager authenticationManager;
    private final AccountAccess accountAccess;
    private final RateLimiter rateLimiter;
    private final AuditLog audit;

    LoginService(AuthenticationManager authenticationManager, AccountAccess accountAccess, RateLimiter rateLimiter, AuditLog audit) {
        this.authenticationManager = authenticationManager;
        this.accountAccess = accountAccess;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
    }

    public AccountAccess.Grant login(String identifier, String password, String clientAddress) {
        String identifierKey = EmailAddress.normalize(identifier);
        Optional<Duration> wait = rateLimiter.blockedFor(PER_IDENTIFIER, identifierKey)
                .or(() -> rateLimiter.blockedFor(PER_CLIENT, clientAddress));
        if (wait.isPresent()) {
            audit.record(null, "LOGIN", null, null, AuditLog.Outcome.DENIED);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Çok fazla deneme yapıldı; biraz sonra tekrar dene", wait.get());
        }
        try {
            var authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(identifierKey, password));
            SatirUserDetails account = (SatirUserDetails) authentication.getPrincipal();
            AccountAccess.Grant grant = accountAccess.current(account.userId()).orElseThrow(LoginService::invalidCredentials);
            audit.record(grant.userId(), "LOGIN", "USER", grant.userId(), AuditLog.Outcome.SUCCESS);
            return grant;
        } catch (AuthenticationException failure) {
            rateLimiter.record(PER_IDENTIFIER, identifierKey);
            rateLimiter.record(PER_CLIENT, clientAddress);
            audit.record(null, "LOGIN", null, null, AuditLog.Outcome.FAILURE);
            throw invalidCredentials();
        }
    }

    private static ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "E-posta, kullanıcı adı veya parola hatalı");
    }
}
