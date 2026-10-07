package com.satir.identity.application;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.identity.domain.AccountStatus;
import com.satir.identity.domain.Role;
import com.satir.identity.infrastructure.UserAccountRepository;
import com.satir.identity.infrastructure.UserPreferenceEntity;
import com.satir.identity.infrastructure.UserPreferenceRepository;

/** Reads the signed-in account's own profile. Never used to look up another account. */
@Service
public class ProfileQuery {

    public record ProfileView(UUID id, String name, String email, boolean verified, String avatar, Role role,
            boolean publicationEmail, String timeZone, long version) {
    }

    private final UserAccountRepository users;
    private final UserPreferenceRepository preferences;

    ProfileQuery(UserAccountRepository users, UserPreferenceRepository preferences) {
        this.users = users;
        this.preferences = preferences;
    }

    @Transactional(readOnly = true)
    public Optional<ProfileView> ownProfile(UUID userId) {
        return users.findById(userId)
                .filter(user -> user.getStatus() != AccountStatus.DELETED)
                .map(user -> {
                    UserPreferenceEntity preference = preferences.findById(userId)
                            .orElseGet(() -> UserPreferenceEntity.defaults(userId));
                    return new ProfileView(user.getId(), user.getDisplayName(), user.getEmail(),
                            user.isVerifiedAndActive(), user.getAvatarKey(), user.getRole(),
                            preference.isPublicationEmail(), preference.getPreferredTimezone(), user.getVersion());
                });
    }
}
