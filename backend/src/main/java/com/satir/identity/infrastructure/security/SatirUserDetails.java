package com.satir.identity.infrastructure.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Login-time view of an account used only while verifying a password. It is never stored in the
 * session (the session keeps a {@code SatirPrincipal}); the hash is erased after authentication.
 */
public final class SatirUserDetails implements UserDetails, CredentialsContainer {

    private final UUID userId;
    private String passwordHash;

    SatirUserDetails(UUID userId, String passwordHash) {
        this.userId = userId;
        this.passwordHash = passwordHash;
    }

    public UUID userId() {
        return userId;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return userId.toString();
    }

    @Override
    public void eraseCredentials() {
        passwordHash = null;
    }

    @Override
    public String toString() {
        return "SatirUserDetails[userId=" + userId + "]";
    }
}
