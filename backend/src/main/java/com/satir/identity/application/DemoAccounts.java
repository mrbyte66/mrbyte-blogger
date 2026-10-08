package com.satir.identity.application;

import java.nio.CharBuffer;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.identity.domain.DisplayName;
import com.satir.identity.domain.EmailAddress;
import com.satir.identity.domain.PasswordPolicy;
import com.satir.identity.domain.Role;
import com.satir.identity.infrastructure.MembershipRepository;
import com.satir.identity.infrastructure.UserAccountEntity;
import com.satir.identity.infrastructure.UserAccountRepository;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.db.IdGenerator;

/**
 * Accounts for the {@code seed-demo} command. Verified members are created without the e-mail round trip,
 * so every method refuses unless {@code satir.seed.enabled} is set (only the dev and test profiles do).
 */
@Service
public class DemoAccounts {

    private final MembershipRepository members;
    private final UserAccountRepository users;
    private final PasswordEncoder passwords;
    private final AuditLog audit;
    private final IdGenerator ids;
    private final Clock clock;
    private final boolean enabled;

    DemoAccounts(MembershipRepository members, UserAccountRepository users, PasswordEncoder passwords, AuditLog audit,
            IdGenerator ids, Clock clock, @Value("${satir.seed.enabled:false}") boolean enabled) {
        this.members = members;
        this.users = users;
        this.passwords = passwords;
        this.audit = audit;
        this.ids = ids;
        this.clock = clock;
        this.enabled = enabled;
    }

    public boolean enabled() {
        return enabled;
    }

    @Transactional(readOnly = true)
    public Optional<UUID> ownerId() {
        requireEnabled();
        return users.findFirstByRole(Role.OWNER).map(UserAccountEntity::getId);
    }

    /** Returns the existing account for the address (unchanged), or creates a verified member. */
    @Transactional
    public Member ensureVerifiedMember(String email, String name, char[] password) {
        requireEnabled();
        EmailAddress address = EmailAddress.parse("email", email);
        Optional<MembershipRepository.Account> existing = members.byEmail(address.normalized());
        if (existing.isPresent()) {
            return new Member(existing.get().id(), false);
        }
        String displayName = DisplayName.parse("name", name);
        PasswordPolicy.check("password", password);
        Instant now = clock.instant();
        UUID id = ids.next();
        members.insertMember(id, address.value(), address.normalized(), displayName, true, now);
        members.setPassword(id, passwords.encode(CharBuffer.wrap(password)), now);
        audit.record(null, "DEMO_SEED_MEMBER", "USER", id, AuditLog.Outcome.SUCCESS);
        return new Member(id, true);
    }

    public record Member(UUID id, boolean created) {
    }

    private void requireEnabled() {
        if (!enabled) {
            throw new IllegalStateException("Örnek veri yalnız dev ortamında yüklenebilir (satir.seed.enabled)");
        }
    }
}
