package com.satir.identity.application;

import java.nio.CharBuffer;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.identity.domain.DisplayName;
import com.satir.identity.domain.EmailAddress;
import com.satir.identity.domain.OwnerUsername;
import com.satir.identity.domain.PasswordPolicy;
import com.satir.identity.domain.Role;
import com.satir.identity.infrastructure.PasswordCredentialEntity;
import com.satir.identity.infrastructure.PasswordCredentialRepository;
import com.satir.identity.infrastructure.UserAccountEntity;
import com.satir.identity.infrastructure.UserAccountRepository;
import com.satir.identity.infrastructure.UserPreferenceEntity;
import com.satir.identity.infrastructure.UserPreferenceRepository;
import com.satir.platform.api.ApiException;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.db.IdGenerator;

/**
 * Creates the single site owner. There is no public owner registration: this runs only from the
 * operator command. An existing owner is never overwritten and a second owner is refused (also
 * enforced by a partial unique index).
 */
@Service
public class OwnerBootstrapService {

    private final UserAccountRepository users;
    private final PasswordCredentialRepository credentials;
    private final UserPreferenceRepository preferences;
    private final PasswordEncoder passwordEncoder;
    private final AuditLog audit;
    private final IdGenerator ids;
    private final Clock clock;

    OwnerBootstrapService(UserAccountRepository users, PasswordCredentialRepository credentials,
            UserPreferenceRepository preferences, PasswordEncoder passwordEncoder, AuditLog audit,
            IdGenerator ids, Clock clock) {
        this.users = users;
        this.credentials = credentials;
        this.preferences = preferences;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.ids = ids;
        this.clock = clock;
    }

    @Transactional
    public UUID bootstrap(String email, String username, String displayName, char[] password) {
        EmailAddress address = EmailAddress.parse("email", email);
        String ownerUsername = OwnerUsername.parse("username", username);
        String name = DisplayName.parse("name", displayName);
        PasswordPolicy.check("password", password);

        if (users.existsByRole(Role.OWNER)) {
            throw new ApiException(HttpStatus.CONFLICT, "OWNER_ALREADY_EXISTS", "Site sahibi hesabı zaten var");
        }
        if (users.existsByEmailNormalized(address.normalized()) || users.existsByOwnerUsername(ownerUsername)) {
            throw new ApiException(HttpStatus.CONFLICT, "IDENTITY_IN_USE", "Bu e-posta veya kullanıcı adı kullanılıyor");
        }

        Instant now = clock.instant();
        UUID id = ids.next();
        users.saveAndFlush(UserAccountEntity.newOwner(id, address, ownerUsername, name, now));
        credentials.save(new PasswordCredentialEntity(id, passwordEncoder.encode(CharBuffer.wrap(password)), now));
        preferences.save(UserPreferenceEntity.defaults(id));
        audit.record(null, "OWNER_BOOTSTRAP", "USER", id, AuditLog.Outcome.SUCCESS);
        return id;
    }
}
