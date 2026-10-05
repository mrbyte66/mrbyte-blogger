package com.satir.identity.application;

import java.nio.CharBuffer;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.identity.domain.DisplayName;
import com.satir.identity.domain.EmailAddress;
import com.satir.identity.domain.PasswordPolicy;
import com.satir.identity.infrastructure.MembershipRepository;
import com.satir.identity.infrastructure.MembershipRepository.Account;
import com.satir.identity.infrastructure.Secrets;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.ratelimit.RateLimiter;
import com.satir.platform.validation.ValidationException;

/**
 * Member account lifecycle (API contract §4). Public endpoints never reveal whether an address
 * has an account: they always answer 202 and only the address owner receives mail. Membership
 * never grants Studio or authoring rights; roles are not writable.
 */
@Service
public class MembershipService {

    public static final Set<String> AVATARS = Stream.concat(
            Stream.of("initials", "round", "glasses", "curly", "reader", "robot"),
            IntStream.rangeClosed(1, 54).mapToObj(i -> "portrait-%02d".formatted(i)))
            .collect(Collectors.toUnmodifiableSet());

    static final Duration VERIFY_TTL = Duration.ofHours(24);
    static final Duration RESET_TTL = Duration.ofMinutes(30);
    static final Duration EMAIL_CHANGE_TTL = Duration.ofHours(24);
    private static final RateLimiter.Limit MAIL_PER_ADDRESS = new RateLimiter.Limit("account-mail-address", 3, Duration.ofHours(1));
    private static final RateLimiter.Limit MAIL_PER_CLIENT = new RateLimiter.Limit("account-mail-client", 20, Duration.ofHours(1));
    private static final RateLimiter.Limit REAUTH = new RateLimiter.Limit("reauth", 5, Duration.ofMinutes(15));

    public record Connection(String provider, Instant connectedAt) {
    }

    private final MembershipRepository members;
    private final PasswordEncoder passwords;
    private final Secrets secrets;
    private final AuthMailer mailer;
    private final RateLimiter rateLimiter;
    private final AuditLog audit;
    private final IdGenerator ids;
    private final Clock clock;

    MembershipService(MembershipRepository members, PasswordEncoder passwords, Secrets secrets, AuthMailer mailer,
            RateLimiter rateLimiter, AuditLog audit, IdGenerator ids, Clock clock) {
        this.members = members;
        this.passwords = passwords;
        this.secrets = secrets;
        this.mailer = mailer;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
        this.ids = ids;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- registration & verification

    @Transactional
    public void register(String name, String email, char[] password, char[] confirmation, String client) {
        String displayName = DisplayName.parse("name", name);
        EmailAddress address = EmailAddress.parse("email", email);
        checkNewPassword(password, confirmation);
        throttle(address.normalized(), client);
        Instant now = clock.instant();
        Optional<Account> existing = members.byEmail(address.normalized());
        if (existing.isPresent()) {
            Account account = existing.get();
            if ("PENDING".equals(account.status())) {
                issueVerification(account.id(), account.email(), account.displayName(), now);
            } else if (!account.deleted()) {
                mailer.alreadyRegistered(account.email(), account.displayName());
            }
            return; // same 202 as a fresh registration
        }
        UUID id = ids.next();
        members.insertMember(id, address.value(), address.normalized(), displayName, false, now);
        members.setPassword(id, passwords.encode(CharBuffer.wrap(password)), now);
        issueVerification(id, address.value(), displayName, now);
        audit.record(id, "REGISTER", "USER", id, AuditLog.Outcome.SUCCESS);
    }

    @Transactional
    public void resendVerification(String email, String client) {
        String normalized = EmailAddress.parse("email", email).normalized();
        throttle(normalized, client);
        members.byEmail(normalized).filter(a -> "PENDING".equals(a.status()))
                .ifPresent(a -> issueVerification(a.id(), a.email(), a.displayName(), clock.instant()));
    }

    /** Single-use; does not sign the user in (they log in afterwards). */
    @Transactional
    public void confirmVerification(String token) {
        Instant now = clock.instant();
        MembershipRepository.Token valid = consume(token, "VERIFY", now);
        members.markVerified(valid.userId(), now);
        audit.record(valid.userId(), "EMAIL_VERIFY", "USER", valid.userId(), AuditLog.Outcome.SUCCESS);
    }

    // ---------------------------------------------------------------- password recovery & change

    @Transactional
    public void forgotPassword(String email, String client) {
        String normalized = EmailAddress.parse("email", email).normalized();
        throttle(normalized, client);
        members.byEmail(normalized).filter(a -> !a.deleted()).ifPresent(account -> {
            Instant now = clock.instant();
            members.retireTokens(account.id(), "RESET", now);
            String token = Secrets.newToken();
            members.insertToken(ids.next(), account.id(), "RESET", Secrets.hash(token), null, now.plus(RESET_TTL), now);
            mailer.passwordReset(account.email(), account.displayName(), token);
        });
    }

    /** Proves control of the address, so a pending account becomes verified. Caller ends every session. */
    @Transactional
    public UUID resetPassword(String token, char[] password, char[] confirmation) {
        checkNewPassword(password, confirmation);
        Instant now = clock.instant();
        MembershipRepository.Token valid = consume(token, "RESET", now);
        members.setPassword(valid.userId(), passwords.encode(CharBuffer.wrap(password)), now);
        members.markVerified(valid.userId(), now);
        audit.record(valid.userId(), "PASSWORD_RESET", "USER", valid.userId(), AuditLog.Outcome.SUCCESS);
        return valid.userId();
    }

    /** Requires recent re-authentication (checked by the caller); the caller ends every session. */
    @Transactional
    public void changePassword(UUID userId, char[] password, char[] confirmation) {
        checkNewPassword(password, confirmation);
        members.setPassword(userId, passwords.encode(CharBuffer.wrap(password)), clock.instant());
        audit.record(userId, "PASSWORD_CHANGE", "USER", userId, AuditLog.Outcome.SUCCESS);
    }

    /** Password re-authentication; returns until when sensitive actions are allowed. */
    public void verifyPassword(UUID userId, String password) {
        String key = userId.toString();
        rateLimiter.blockedFor(REAUTH, key).ifPresent(wait -> {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Çok fazla deneme yapıldı", wait);
        });
        Optional<String> hash = members.passwordHash(userId);
        if (hash.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "PASSWORD_NOT_SET", "Bu hesapta parola yok; Google ile doğrula");
        }
        if (password == null || !passwords.matches(password, hash.get())) {
            rateLimiter.record(REAUTH, key);
            audit.record(userId, "REAUTH", "USER", userId, AuditLog.Outcome.FAILURE);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Parola hatalı");
        }
        audit.record(userId, "REAUTH", "USER", userId, AuditLog.Outcome.SUCCESS);
    }

    // ---------------------------------------------------------------- e-mail change

    @Transactional
    public void requestEmailChange(UUID userId, String email, String client) {
        EmailAddress address = EmailAddress.parse("email", email);
        throttle(address.normalized(), client);
        Account account = members.byId(userId, false).orElseThrow(MembershipService::unauthenticated);
        if (members.byEmail(address.normalized()).isPresent()) {
            return; // never reveal that another account uses the address
        }
        Instant now = clock.instant();
        members.retireTokens(userId, "EMAIL_CHANGE", now);
        String token = Secrets.newToken();
        members.insertToken(ids.next(), userId, "EMAIL_CHANGE", Secrets.hash(token), secrets.encrypt(address.value()),
                now.plus(EMAIL_CHANGE_TTL), now);
        mailer.emailChange(address.value(), account.displayName(), token);
    }

    @Transactional
    public UUID confirmEmailChange(String token) {
        Instant now = clock.instant();
        MembershipRepository.Token valid = consume(token, "EMAIL_CHANGE", now);
        EmailAddress target = EmailAddress.parse("email", secrets.decrypt(valid.encryptedTargetEmail()));
        Optional<Account> holder = members.byEmail(target.normalized());
        if (holder.isPresent() && !holder.get().id().equals(valid.userId())) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Bu e-posta adresi artık kullanılamıyor");
        }
        members.updateEmail(valid.userId(), target.value(), target.normalized(), now);
        audit.record(valid.userId(), "EMAIL_CHANGE", "USER", valid.userId(), AuditLog.Outcome.SUCCESS);
        return valid.userId();
    }

    // ---------------------------------------------------------------- profile & preferences

    @Transactional
    public void updateProfile(UUID userId, long expectedVersion, String name, String avatar, boolean avatarPresent) {
        Account account = members.byId(userId, true).orElseThrow(MembershipService::unauthenticated);
        Preconditions.check(expectedVersion, account.version());
        String nextName = name == null ? account.displayName() : DisplayName.parse("name", name);
        String nextAvatar = avatarPresent ? avatar : account.avatarKey();
        if (nextAvatar != null && !AVATARS.contains(nextAvatar)) {
            throw new ValidationException("avatar", "INVALID");
        }
        if (members.updateProfile(userId, expectedVersion, nextName, nextAvatar, clock.instant()) == 0) {
            throw Preconditions.stale();
        }
    }

    @Transactional
    public void updatePreferences(UUID userId, long expectedVersion, Boolean publicationEmail, String timeZone,
            ProfileQuery.ProfileView current) {
        String zone = timeZone == null ? current.timeZone() : validZone(timeZone);
        boolean publication = publicationEmail == null ? current.publicationEmail() : publicationEmail;
        if (members.updatePreferences(userId, expectedVersion, publication, zone, clock.instant()) == 0) {
            throw Preconditions.stale();
        }
    }

    // ---------------------------------------------------------------- connections & deletion

    @Transactional(readOnly = true)
    public List<Connection> connections(UUID userId) {
        return members.identities(userId).stream()
                .map(identity -> new Connection(identity.provider().toLowerCase(Locale.ROOT), identity.createdAt()))
                .toList();
    }

    @Transactional
    public void unlinkGoogle(UUID userId) {
        members.byId(userId, true).orElseThrow(MembershipService::unauthenticated);
        if (members.identities(userId).stream().noneMatch(i -> "GOOGLE".equals(i.provider()))) {
            return;
        }
        if (!members.hasPassword(userId)) {
            throw new ApiException(HttpStatus.CONFLICT, "LAST_LOGIN_METHOD", "Son giriş yöntemini kaldıramazsın; önce parola belirle");
        }
        members.deleteIdentity(userId, "GOOGLE");
        audit.record(userId, "GOOGLE_UNLINK", "USER", userId, AuditLog.Outcome.SUCCESS);
    }

    @Transactional
    public void deleteAccount(UUID userId, String confirmation) {
        Account account = members.byId(userId, true).orElseThrow(MembershipService::unauthenticated);
        if ("OWNER".equals(account.role())) {
            throw new ApiException(HttpStatus.CONFLICT, "OWNER_DELETE_REQUIRES_MIGRATION",
                    "Site sahibi hesabı buradan silinemez");
        }
        if (!"DELETE".equals(confirmation)) {
            throw new ValidationException("confirmation", "INVALID");
        }
        members.tombstone(userId, clock.instant());
        audit.record(userId, "ACCOUNT_DELETE", "USER", userId, AuditLog.Outcome.SUCCESS);
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT3M")
    @Transactional
    public void purgeTokens() {
        members.purgeTokens(clock.instant().minus(Duration.ofHours(24)));
    }

    // ---------------------------------------------------------------- helpers

    private void issueVerification(UUID userId, String email, String name, Instant now) {
        members.retireTokens(userId, "VERIFY", now);
        String token = Secrets.newToken();
        members.insertToken(ids.next(), userId, "VERIFY", Secrets.hash(token), null, now.plus(VERIFY_TTL), now);
        mailer.verification(email, name, token);
    }

    private MembershipRepository.Token consume(String token, String purpose, Instant now) {
        if (token == null || token.isBlank() || token.length() > 100) {
            throw invalidToken();
        }
        MembershipRepository.Token valid = members.lockValidToken(Secrets.hash(token.strip()), purpose, now)
                .orElseThrow(MembershipService::invalidToken);
        Account account = members.byId(valid.userId(), true).orElseThrow(MembershipService::invalidToken);
        if (account.deleted()) {
            throw invalidToken();
        }
        members.consumeToken(valid.id(), now);
        return valid;
    }

    private void throttle(String address, String client) {
        rateLimiter.blockedFor(MAIL_PER_ADDRESS, address).or(() -> rateLimiter.blockedFor(MAIL_PER_CLIENT, client))
                .ifPresent(wait -> {
                    throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                            "Çok fazla istek yapıldı; biraz sonra tekrar dene", wait);
                });
        rateLimiter.record(MAIL_PER_ADDRESS, address);
        rateLimiter.record(MAIL_PER_CLIENT, client);
    }

    private static void checkNewPassword(char[] password, char[] confirmation) {
        PasswordPolicy.check("password", password);
        if (confirmation == null || !java.util.Arrays.equals(password, confirmation)) {
            throw new ValidationException("passwordConfirmation", "MISMATCH");
        }
    }

    private static String validZone(String zone) {
        try {
            return ZoneId.of(zone).getId();
        } catch (DateTimeException e) {
            throw new ValidationException("timeZone", "INVALID");
        }
    }

    private static ApiException invalidToken() {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_TOKEN", "Bağlantı geçersiz veya süresi dolmuş");
    }

    static ApiException unauthenticated() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Giriş yapman gerekiyor");
    }
}
