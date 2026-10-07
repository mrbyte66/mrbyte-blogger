package com.satir.identity.application;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.satir.identity.domain.Role;

/**
 * Role-specific session lifetimes (architecture §5 proposal: member 7d idle / 30d absolute,
 * owner 30min idle / 8h absolute). Idle renews on activity; absolute never extends.
 */
@ConfigurationProperties("satir.session")
public record SessionPolicy(Duration ownerIdle, Duration ownerAbsolute, Duration memberIdle, Duration memberAbsolute) {

    /** Session attribute holding the absolute expiry as epoch milliseconds (a {@code Long}). */
    public static final String ABSOLUTE_EXPIRY_ATTRIBUTE = "satir.absoluteExpiresAt";

    public Duration idle(Role role) {
        return role == Role.OWNER ? ownerIdle : memberIdle;
    }

    public Duration absolute(Role role) {
        return role == Role.OWNER ? ownerAbsolute : memberAbsolute;
    }
}
