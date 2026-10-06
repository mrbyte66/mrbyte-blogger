package com.satir.identity.domain;

import java.time.Instant;
import java.util.UUID;
public record UserAccount(UUID id, String name, String email, String username, String role, String status,
                          String avatar, Instant createdAt, long version, boolean publicationEmail, String timeZone, long authenticationGeneration) {
    public boolean active() { return status.equals("ACTIVE"); }
    public boolean owner() { return role.equals("OWNER"); }
}
