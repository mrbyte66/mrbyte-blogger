package com.satir.identity.application;

import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.identity.domain.DisplayName;
import com.satir.identity.domain.EmailAddress;
import com.satir.identity.infrastructure.GoogleClient;
import com.satir.identity.infrastructure.MembershipRepository;
import com.satir.identity.infrastructure.MembershipRepository.Account;
import com.satir.identity.infrastructure.Secrets;
import com.satir.platform.api.ApiException;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.db.IdGenerator;

/**
 * Google sign-in, account linking and re-authentication (architecture §5). The (provider, subject)
 * pair is the authority. An e-mail that already belongs to another account is never merged
 * automatically: the user signs in to that account and links Google from there. Owner accounts
 * cannot use Google in V1.
 */
@Service
public class GoogleSignIn {

    public enum Purpose { LOGIN, LINK, REAUTH }

    /** Kept in the server session between start and callback; never sent to the browser. */
    public record Pending(String state, String nonce, String codeVerifier, Purpose purpose, String returnTo,
            UUID userId, Instant expiresAt) implements Serializable {
    }

    public sealed interface Result {
        record SignedIn(AccountAccess.Grant grant) implements Result {
        }

        record Linked() implements Result {
        }

        record Reauthenticated() implements Result {
        }

        record Failed(String code) implements Result {
        }
    }

    private static final Duration PENDING_TTL = Duration.ofMinutes(10);
    private static final Pattern SAFE_RETURN = Pattern.compile("/[A-Za-z0-9/_\\-?=&.%]{0,199}");

    private final GoogleClient google;
    private final MembershipRepository members;
    private final AccountAccess accountAccess;
    private final AuditLog audit;
    private final IdGenerator ids;
    private final Clock clock;

    GoogleSignIn(GoogleClient google, MembershipRepository members, AccountAccess accountAccess, AuditLog audit,
            IdGenerator ids, Clock clock) {
        this.google = google;
        this.members = members;
        this.accountAccess = accountAccess;
        this.audit = audit;
        this.ids = ids;
        this.clock = clock;
    }

    public record Start(Pending pending, String authorizationUrl) {
    }

    public Start start(Purpose purpose, String returnTo, UUID currentUser) {
        if (!google.configured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_NOT_CONFIGURED", "Google ile giriş henüz yapılandırılmadı");
        }
        if (purpose != Purpose.LOGIN && currentUser == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Giriş yapman gerekiyor");
        }
        if (currentUser != null && purpose != Purpose.LOGIN) {
            Account account = members.byId(currentUser, false).orElseThrow(MembershipService::unauthenticated);
            if ("OWNER".equals(account.role())) {
                throw new ApiException(HttpStatus.CONFLICT, "OWNER_GOOGLE_DISABLED", "Site sahibi hesabında Google kullanılamaz");
            }
        }
        String verifier = Secrets.randomUrlSafe(32);
        Pending pending = new Pending(Secrets.randomUrlSafe(32), Secrets.randomUrlSafe(32), verifier, purpose,
                safeReturn(returnTo), purpose == Purpose.LOGIN ? null : currentUser, clock.instant().plus(PENDING_TTL));
        return new Start(pending, google.authorizationUrl(pending.state(), pending.nonce(), challenge(verifier)));
    }

    /** Completes the flow; {@code currentUser} is the session's account at callback time (if any). */
    @Transactional
    public Result complete(Pending pending, String state, String code, UUID currentUser) {
        if (pending == null || state == null || !Secrets.constantTimeEquals(pending.state(), state)
                || clock.instant().isAfter(pending.expiresAt())) {
            return new Result.Failed("google_state");
        }
        if (code == null || code.isBlank()) {
            return new Result.Failed("google_cancelled");
        }
        Optional<GoogleClient.Identity> verified = google.exchange(code, pending.codeVerifier());
        if (verified.isEmpty() || !Secrets.constantTimeEquals(pending.nonce(), verified.get().nonce())) {
            return new Result.Failed("google_failed");
        }
        GoogleClient.Identity identity = verified.get();
        if (!identity.emailVerified() || identity.email() == null) {
            return new Result.Failed("google_email_unverified");
        }
        Optional<MembershipRepository.Identity> linked = members.identity("GOOGLE", identity.subject());
        return switch (pending.purpose()) {
            case LOGIN -> login(identity, linked);
            case LINK -> link(pending, identity, linked, currentUser);
            case REAUTH -> linked.isPresent() && linked.get().userId().equals(currentUser)
                    && currentUser.equals(pending.userId())
                    ? new Result.Reauthenticated() : new Result.Failed("google_reauth_mismatch");
        };
    }

    private Result login(GoogleClient.Identity identity, Optional<MembershipRepository.Identity> linked) {
        Instant now = clock.instant();
        if (linked.isPresent()) {
            Account account = members.byId(linked.get().userId(), false).orElse(null);
            if (account == null || account.deleted()) {
                return new Result.Failed("google_failed");
            }
            if ("OWNER".equals(account.role())) {
                return new Result.Failed("owner_google_disabled");
            }
            audit.record(account.id(), "LOGIN_GOOGLE", "USER", account.id(), AuditLog.Outcome.SUCCESS);
            return accountAccess.current(account.id()).<Result>map(Result.SignedIn::new).orElse(new Result.Failed("google_failed"));
        }
        EmailAddress email = EmailAddress.parse("email", identity.email());
        if (members.byEmail(email.normalized()).isPresent()) {
            // Same address on another account: no automatic merge (account takeover protection).
            return new Result.Failed("account_exists");
        }
        UUID id = ids.next();
        String name = identity.name() == null || identity.name().isBlank() ? email.value().split("@")[0]
                : DisplayName.parse("name", identity.name().length() > 80 ? identity.name().substring(0, 80) : identity.name());
        members.insertMember(id, email.value(), email.normalized(), name, true, now);
        members.insertIdentity(ids.next(), id, "GOOGLE", identity.subject(), now);
        audit.record(id, "REGISTER_GOOGLE", "USER", id, AuditLog.Outcome.SUCCESS);
        return accountAccess.current(id).<Result>map(Result.SignedIn::new).orElse(new Result.Failed("google_failed"));
    }

    private Result link(Pending pending, GoogleClient.Identity identity, Optional<MembershipRepository.Identity> linked,
            UUID currentUser) {
        if (currentUser == null || !currentUser.equals(pending.userId())) {
            return new Result.Failed("google_link_session");
        }
        if (linked.isPresent()) {
            return new Result.Failed(linked.get().userId().equals(currentUser) ? "google_already_linked" : "google_identity_in_use");
        }
        if (members.identities(currentUser).stream().anyMatch(i -> "GOOGLE".equals(i.provider()))) {
            return new Result.Failed("google_already_linked");
        }
        members.insertIdentity(ids.next(), currentUser, "GOOGLE", identity.subject(), clock.instant());
        audit.record(currentUser, "GOOGLE_LINK", "USER", currentUser, AuditLog.Outcome.SUCCESS);
        return new Result.Linked();
    }

    /** Only same-origin relative paths are accepted; anything else returns to the home page. */
    static String safeReturn(String returnTo) {
        if (returnTo == null || !SAFE_RETURN.matcher(returnTo).matches() || returnTo.startsWith("//") || returnTo.contains("\\")) {
            return "/";
        }
        return returnTo;
    }

    private static String challenge(String verifier) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
