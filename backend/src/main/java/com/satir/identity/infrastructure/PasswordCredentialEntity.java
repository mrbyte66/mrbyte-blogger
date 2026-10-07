package com.satir.identity.infrastructure;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Password hash for an account. Read only by the identity module; never logged or returned. */
@Entity
@Table(name = "password_credential")
public class PasswordCredentialEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    protected PasswordCredentialEntity() {
    }

    public PasswordCredentialEntity(UUID userId, String passwordHash, Instant changedAt) {
        this.userId = userId;
        this.passwordHash = passwordHash;
        this.changedAt = changedAt;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    @Override
    public String toString() {
        return "PasswordCredentialEntity[userId=" + userId + "]";
    }
}
