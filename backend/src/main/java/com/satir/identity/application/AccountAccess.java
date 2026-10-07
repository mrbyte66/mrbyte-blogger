package com.satir.identity.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.identity.domain.AccountStatus;
import com.satir.identity.domain.Role;
import com.satir.identity.infrastructure.UserAccountRepository;

/** Current access rights of an account, read fresh from the database for each authenticated request. */
@Service
public class AccountAccess {

    public record Grant(UUID userId, Role role, List<GrantedAuthority> authorities) {
    }

    private final UserAccountRepository users;

    AccountAccess(UserAccountRepository users) {
        this.users = users;
    }

    /** Empty when the account no longer exists or has been deleted: its sessions must stop working. */
    @Transactional(readOnly = true)
    public Optional<Grant> current(UUID userId) {
        return users.findById(userId)
                .filter(user -> user.getStatus() != AccountStatus.DELETED)
                .map(user -> new Grant(user.getId(), user.getRole(),
                        Authorities.of(user.getRole(), user.getStatus(), user.isVerifiedAndActive())));
    }
}
