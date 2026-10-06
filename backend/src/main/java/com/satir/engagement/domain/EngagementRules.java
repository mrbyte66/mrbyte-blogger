package com.satir.engagement.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import com.satir.platform.validation.ValidationException;

/** Pure rules for claps and view events (architecture §7, API contract §6). */
public final class EngagementRules {

    /** Who reacts: a verified member, a cookie-identified anonymous actor, or nobody yet. */
    public sealed interface Actor {
        record Member(UUID userId) implements Actor {
        }

        record Anonymous(UUID actorId) implements Actor {
        }

        record None() implements Actor {
        }
    }

    public enum Source { CARD, PERMALINK }

    /** Product assumption (architecture §6): anonymous clap identity lives 180 days. */
    public static final Duration ANONYMOUS_LIFETIME = Duration.ofDays(180);
    public static final Duration MAX_EVENT_AGE = Duration.ofHours(24);
    public static final Duration MAX_EVENT_SKEW = Duration.ofMinutes(5);
    public static final Duration RECEIPT_RETENTION = Duration.ofDays(30);

    /** Common crawler/preview/automation user agents. Not a guarantee; real abuse is also rate limited. */
    private static final Pattern BOT = Pattern.compile(
            "bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|"
                    + "headless|phantomjs|puppeteer|playwright|lighthouse|curl/|wget/|python-requests|httpclient|okhttp|java/");

    private EngagementRules() {
    }

    public static boolean looksAutomated(String userAgent) {
        return userAgent == null || userAgent.isBlank() || BOT.matcher(userAgent.toLowerCase(Locale.ROOT)).find();
    }

    public static Source source(String raw) {
        if (raw == null) {
            throw new ValidationException("source", "REQUIRED");
        }
        return switch (raw) {
            case "card" -> Source.CARD;
            case "permalink" -> Source.PERMALINK;
            default -> throw new ValidationException("source", "INVALID");
        };
    }

    /** Client event times are accepted only within 24 h in the past and 5 min in the future. */
    public static void checkWindow(Instant occurredAt, Instant now) {
        if (occurredAt == null) {
            throw new ValidationException("occurredAt", "REQUIRED");
        }
        if (occurredAt.isBefore(now.minus(MAX_EVENT_AGE)) || occurredAt.isAfter(now.plus(MAX_EVENT_SKEW))) {
            throw new ValidationException("occurredAt", "OUT_OF_WINDOW");
        }
    }
}
