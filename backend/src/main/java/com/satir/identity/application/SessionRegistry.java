package com.satir.identity.application;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;


/**
 * An account's own server sessions. The session ID is the cookie secret, so clients only ever see
 * an HMAC-derived opaque handle; revocation deletes the server-side session row.
 */
@Component
public class SessionRegistry {

    public static final String DEVICE_ATTRIBUTE = "satir.device";

    public record SessionInfo(String id, boolean current, String deviceLabel, Instant createdAt, Instant lastSeenAt,
            Instant expiresAt) {
    }

    private final ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> repository;
    private final SecretKeySpec key;

    SessionRegistry(ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> repository,
            @Value("${satir.security.rate-limit-key}") String secret) {
        this.repository = repository;
        this.key = new SecretKeySpec(("satir/session-handle/v1:" + secret).getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public List<SessionInfo> list(UUID userId, String currentSessionId) {
        return sessions(userId).values().stream()
                .map(session -> {
                    Instant idleDeadline = session.getLastAccessedTime().plus(session.getMaxInactiveInterval());
                    Object absolute = session.getAttribute(SessionPolicy.ABSOLUTE_EXPIRY_ATTRIBUTE);
                    Instant expires = absolute instanceof Long millis && Instant.ofEpochMilli(millis).isBefore(idleDeadline)
                            ? Instant.ofEpochMilli(millis) : idleDeadline;
                    Object device = session.getAttribute(DEVICE_ATTRIBUTE);
                    return new SessionInfo(handle(session.getId()), session.getId().equals(currentSessionId),
                            device instanceof String label ? label : "Bilinmeyen cihaz", session.getCreationTime(),
                            session.getLastAccessedTime(), expires);
                })
                .sorted(Comparator.comparing(SessionInfo::lastSeenAt).reversed())
                .toList();
    }

    /** Deletes the session with this handle if it belongs to the account; false otherwise (→ 404). */
    public boolean revoke(UUID userId, String handle) {
        for (String id : sessions(userId).keySet()) {
            if (handle(id).equals(handle)) {
                repo().deleteById(id);
                return true;
            }
        }
        return false;
    }

    public void revokeAll(UUID userId) {
        sessions(userId).keySet().forEach(id -> repo().deleteById(id));
    }

    public void revokeAllExcept(UUID userId, String keepSessionId) {
        sessions(userId).keySet().stream().filter(id -> !id.equals(keepSessionId)).forEach(id -> repo().deleteById(id));
    }

    public String handle(String sessionId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return HexFormat.of().formatHex(mac.doFinal(sessionId.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Coarse label only (browser family + OS); the raw User-Agent is never stored. */
    public static String deviceLabel(String userAgent) {
        if (userAgent == null) {
            return "Bilinmeyen cihaz";
        }
        String browser = userAgent.contains("Edg/") ? "Edge"
                : userAgent.contains("OPR/") ? "Opera"
                : userAgent.contains("Firefox/") ? "Firefox"
                : userAgent.contains("Chrome/") ? "Chrome"
                : userAgent.contains("Safari/") ? "Safari" : "Tarayıcı";
        String os = userAgent.contains("Windows") ? "Windows"
                : userAgent.contains("iPhone") || userAgent.contains("iPad") ? "iOS"
                : userAgent.contains("Mac OS X") ? "macOS"
                : userAgent.contains("Android") ? "Android"
                : userAgent.contains("Linux") ? "Linux" : "Bilinmeyen sistem";
        return browser + " · " + os;
    }

    private Map<String, ? extends Session> sessions(UUID userId) {
        FindByIndexNameSessionRepository<? extends Session> repo = repository.getIfAvailable();
        return repo == null ? Map.of() : repo.findByPrincipalName(userId.toString());
    }

    private FindByIndexNameSessionRepository<? extends Session> repo() {
        return repository.getObject();
    }
}
