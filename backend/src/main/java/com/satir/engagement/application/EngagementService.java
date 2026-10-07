package com.satir.engagement.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.application.PublicContentQuery;
import com.satir.engagement.domain.EngagementRules;
import com.satir.engagement.domain.EngagementRules.Actor;
import com.satir.engagement.domain.EngagementRules.Source;
import com.satir.engagement.infrastructure.EngagementRepository;
import com.satir.engagement.infrastructure.EngagementRepository.Receipt;
import com.satir.identity.application.AccountDeleted;
import com.satir.platform.api.ApiException;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.ratelimit.RateLimiter;
import com.satir.platform.security.KeyedHash;
import com.satir.platform.validation.ValidationException;

/**
 * Claps and view counting (API contract §6). Only public articles accept reactions; hidden ones
 * are 404. A clap is a target state per actor and article; a view is counted at most once per
 * (actor, article, source, page view) and an event ID replay never counts twice. GETs never count.
 */
@Service
public class EngagementService {

    public record NewActor(UUID id, String cookieValue, Duration lifetime) {
    }

    public record ClapState(boolean clapped, long claps) {
    }

    public record ImpressionResult(boolean accepted, boolean counted, long views) {
    }

    public record Impression(UUID eventId, UUID articleId, String source, UUID pageViewId, Instant occurredAt) {
    }

    private static final RateLimiter.Limit CLAPS_PER_ACTOR = new RateLimiter.Limit("clap-actor", 30, Duration.ofMinutes(1));
    private static final RateLimiter.Limit VIEWS_PER_ACTOR = new RateLimiter.Limit("view-actor", 120, Duration.ofMinutes(1));
    private static final RateLimiter.Limit VIEWS_PER_CLIENT = new RateLimiter.Limit("view-client", 600, Duration.ofMinutes(1));

    private final EngagementRepository repository;
    private final PublicContentQuery content;
    private final RateLimiter rateLimiter;
    private final KeyedHash keyedHash;
    private final IdGenerator ids;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    EngagementService(EngagementRepository repository, PublicContentQuery content, RateLimiter rateLimiter,
            KeyedHash keyedHash, IdGenerator ids, Clock clock) {
        this.repository = repository;
        this.content = content;
        this.rateLimiter = rateLimiter;
        this.keyedHash = keyedHash;
        this.ids = ids;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- anonymous identity

    /** Resolves an anonymous cookie value; expired or unknown values identify nobody. */
    @Transactional(readOnly = true)
    public Optional<UUID> anonymousActor(String cookieValue) {
        if (cookieValue == null || cookieValue.isBlank() || cookieValue.length() > 100) {
            return Optional.empty();
        }
        return repository.actorBySecret(sha256(cookieValue), clock.instant());
    }

    /** A new random anonymous identity; only a hash of the cookie secret is stored. */
    @Transactional
    public NewActor newAnonymousActor() {
        byte[] secret = new byte[32];
        random.nextBytes(secret);
        String value = Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
        UUID id = ids.next();
        Instant now = clock.instant();
        repository.insertActor(id, sha256(value), now, now.plus(EngagementRules.ANONYMOUS_LIFETIME));
        return new NewActor(id, value, EngagementRules.ANONYMOUS_LIFETIME);
    }

    // ---------------------------------------------------------------- claps

    @Transactional(readOnly = true)
    public boolean clapped(UUID articleId, Actor actor) {
        requirePublic(articleId);
        return switch (actor) {
            case Actor.Member member -> repository.memberClapped(articleId, member.userId());
            case Actor.Anonymous anonymous -> repository.anonymousClapped(articleId, anonymous.actorId());
            case Actor.None none -> false;
        };
    }

    @Transactional
    public ClapState setClap(UUID articleId, Actor actor, boolean clapped) {
        requirePublic(articleId);
        String key = actorKey(actor, null);
        rateLimiter.blockedFor(CLAPS_PER_ACTOR, key).ifPresent(wait -> {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Çok hızlı; biraz sonra tekrar dene", wait);
        });
        rateLimiter.record(CLAPS_PER_ACTOR, key);
        Instant now = clock.instant();
        switch (actor) {
            case Actor.Member member -> {
                if (clapped) {
                    repository.addMemberClap(ids.next(), articleId, member.userId(), now);
                } else {
                    repository.removeMemberClap(articleId, member.userId());
                }
            }
            case Actor.Anonymous anonymous -> {
                if (clapped) {
                    repository.addAnonymousClap(ids.next(), articleId, anonymous.actorId(), now);
                } else {
                    repository.removeAnonymousClap(articleId, anonymous.actorId());
                }
            }
            case Actor.None none -> throw new IllegalStateException("clap without an actor");
        }
        return new ClapState(clapped, repository.clapCounts(java.util.List.of(articleId)).getOrDefault(articleId, 0L));
    }

    // ---------------------------------------------------------------- views

    /**
     * Records a visible card or permalink view. The (actor, article, source, page view) slot counts
     * once; the same event ID is a harmless retry, but reusing it for another payload is 409.
     */
    @Transactional
    public ImpressionResult impression(Impression event, Actor actor, String clientAddress, String userAgent) {
        if (event.eventId() == null) {
            throw new ValidationException("eventId", "REQUIRED");
        }
        if (event.articleId() == null) {
            throw new ValidationException("articleId", "REQUIRED");
        }
        if (event.pageViewId() == null) {
            throw new ValidationException("pageViewId", "REQUIRED");
        }
        Source source = EngagementRules.source(event.source());
        Instant now = clock.instant();
        EngagementRules.checkWindow(event.occurredAt(), now);
        requirePublic(event.articleId());
        if (EngagementRules.looksAutomated(userAgent)) {
            return new ImpressionResult(false, false, views(event.articleId()));
        }
        String actorKey = actorKey(actor, clientAddress);
        limit(VIEWS_PER_ACTOR, actorKey);
        limit(VIEWS_PER_CLIENT, clientAddress == null ? "unknown" : clientAddress);

        Receipt receipt = new Receipt(event.articleId(), keyedHash.hash("impression-actor", actorKey), source.name(),
                event.pageViewId(), true);
        Optional<Receipt> previous = repository.receipt(event.eventId());
        if (previous.isPresent()) {
            return replay(previous.get(), receipt, event.articleId());
        }
        if (repository.insertReceipt(event.eventId(), receipt, event.occurredAt(), now)) {
            repository.incrementViews(event.articleId());
            return new ImpressionResult(true, true, views(event.articleId()));
        }
        // Either the slot is already counted (same page view seen again) or a concurrent retry won the race.
        previous = repository.receipt(event.eventId());
        if (previous.isPresent()) {
            return replay(previous.get(), receipt, event.articleId());
        }
        Receipt uncounted = new Receipt(receipt.articleId(), receipt.actorKeyHash(), receipt.source(), receipt.pageViewId(), false);
        repository.insertReceipt(event.eventId(), uncounted, event.occurredAt(), now);
        return new ImpressionResult(true, false, views(event.articleId()));
    }

    // ---------------------------------------------------------------- maintenance

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT7M")
    @Transactional
    public void purgeExpired() {
        Instant now = clock.instant();
        repository.purgeReceiptsBefore(now.minus(EngagementRules.RECEIPT_RETENTION));
        repository.purgeExpiredActors(now);
    }

    /** Member claps belong to the account and disappear with it (runs inside the deletion transaction). */
    @EventListener
    public void onAccountDeleted(AccountDeleted event) {
        repository.deleteMemberClaps(event.userId());
    }

    // ---------------------------------------------------------------- helpers

    private ImpressionResult replay(Receipt previous, Receipt current, UUID articleId) {
        boolean same = previous.articleId().equals(current.articleId()) && previous.source().equals(current.source())
                && previous.pageViewId().equals(current.pageViewId()) && previous.actorKeyHash().equals(current.actorKeyHash());
        if (!same) {
            throw new ApiException(HttpStatus.CONFLICT, "EVENT_ID_REUSED", "Bu olay kimliği başka bir olayda kullanıldı");
        }
        return new ImpressionResult(true, false, views(articleId));
    }

    private long views(UUID articleId) {
        return repository.viewCounts(java.util.List.of(articleId)).getOrDefault(articleId, 0L);
    }

    private void limit(RateLimiter.Limit limit, String subject) {
        rateLimiter.blockedFor(limit, subject).ifPresent(wait -> {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Çok fazla istek; biraz sonra tekrar dene", wait);
        });
        rateLimiter.record(limit, subject);
    }

    private void requirePublic(UUID articleId) {
        if (!content.isArticlePublic(articleId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
        }
    }

    private static String actorKey(Actor actor, String clientAddress) {
        return switch (actor) {
            case Actor.Member member -> "member:" + member.userId();
            case Actor.Anonymous anonymous -> "actor:" + anonymous.actorId();
            case Actor.None none -> "client:" + clientAddress;
        };
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
