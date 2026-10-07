package com.satir.identity.infrastructure.security;

import java.util.Optional;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import com.satir.identity.domain.AccountStatus;
import com.satir.identity.domain.EmailAddress;
import com.satir.identity.infrastructure.PasswordCredentialRepository;
import com.satir.identity.infrastructure.UserAccountEntity;
import com.satir.identity.infrastructure.UserAccountRepository;

/**
 * Resolves a login identifier: an e-mail address, or the owner's username alias (no '@').
 * Deleted accounts and accounts without a password credential are reported as not found; the
 * authentication provider still performs a dummy hash so timing does not reveal which case occurred.
 */
class SatirUserDetailsService implements UserDetailsService {

    private final UserAccountRepository users;
    private final PasswordCredentialRepository credentials;

    SatirUserDetailsService(UserAccountRepository users, PasswordCredentialRepository credentials) {
        this.users = users;
        this.credentials = credentials;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) {
        String key = EmailAddress.normalize(identifier);
        Optional<UserAccountEntity> account = key.contains("@")
                ? users.findByEmailNormalized(key)
                : users.findByOwnerUsername(key);
        return account
                .filter(user -> user.getStatus() != AccountStatus.DELETED)
                .flatMap(user -> credentials.findById(user.getId()))
                .map(credential -> new SatirUserDetails(credential.getUserId(), credential.getPasswordHash()))
                .orElseThrow(() -> new UsernameNotFoundException("unknown identifier"));
    }
}
