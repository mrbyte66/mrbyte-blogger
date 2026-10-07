package com.satir.identity.infrastructure;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import com.satir.identity.domain.AccountStatus;
import com.satir.identity.domain.EmailAddress;
import com.satir.identity.domain.Role;

/** Persistence mapping of {@code app_user}. Never serialized to API responses. */
@Entity
@Table(name = "app_user")
public class UserAccountEntity {

    @Id
    private UUID id;

    private String email;

    @Column(name = "email_normalized")
    private String emailNormalized;

    @Column(name = "owner_username")
    private String ownerUsername;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "avatar_key")
    private String avatarKey;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Enumerated(EnumType.STRING)
    private AccountStatus status;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected UserAccountEntity() {
    }

    /** The owner is created by the operator bootstrap command and is verified by that act. */
    public static UserAccountEntity newOwner(UUID id, EmailAddress email, String username, String displayName, Instant now) {
        UserAccountEntity user = new UserAccountEntity();
        user.id = id;
        user.email = email.value();
        user.emailNormalized = email.normalized();
        user.ownerUsername = username;
        user.displayName = displayName;
        user.role = Role.OWNER;
        user.status = AccountStatus.ACTIVE;
        user.verifiedAt = now;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    public boolean isVerifiedAndActive() {
        return status == AccountStatus.ACTIVE && verifiedAt != null;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getAvatarKey() {
        return avatarKey;
    }

    public Role getRole() {
        return role;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public long getVersion() {
        return version;
    }
}
