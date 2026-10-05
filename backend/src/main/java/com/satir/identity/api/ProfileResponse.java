package com.satir.identity.api;

import java.util.Locale;
import java.util.UUID;

import com.satir.identity.application.ProfileQuery.ProfileView;

/** Contract {@code Profile}: only ever returned for the caller's own account. */
record ProfileResponse(UUID id, String name, String email, boolean verified, String avatar, String role,
        Preferences preferences, long version) {

    record Preferences(boolean publicationEmail, String timeZone) {
    }

    static ProfileResponse from(ProfileView view) {
        return new ProfileResponse(view.id(), view.name(), view.email(), view.verified(), view.avatar(),
                view.role().name().toLowerCase(Locale.ROOT),
                new Preferences(view.publicationEmail(), view.timeZone()), view.version());
    }
}
