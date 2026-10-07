package com.satir.identity.infrastructure;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.satir.identity.domain.Role;

public interface UserAccountRepository extends JpaRepository<UserAccountEntity, UUID> {

    Optional<UserAccountEntity> findByEmailNormalized(String emailNormalized);

    Optional<UserAccountEntity> findByOwnerUsername(String ownerUsername);

    boolean existsByEmailNormalized(String emailNormalized);

    boolean existsByOwnerUsername(String ownerUsername);

    boolean existsByRole(Role role);
}
