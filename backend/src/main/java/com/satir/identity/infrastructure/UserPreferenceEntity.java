package com.satir.identity.infrastructure;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Account-wide preferences. Distinct from browser-local appearance preferences kept by the frontend. */
@Entity
@Table(name = "user_preference")
public class UserPreferenceEntity {

    public static final String DEFAULT_TIME_ZONE = "Europe/Istanbul";

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "publication_email", nullable = false)
    private boolean publicationEmail;

    @Column(name = "preferred_timezone", nullable = false)
    private String preferredTimezone;

    protected UserPreferenceEntity() {
    }

    public static UserPreferenceEntity defaults(UUID userId) {
        UserPreferenceEntity preference = new UserPreferenceEntity();
        preference.userId = userId;
        preference.publicationEmail = true;
        preference.preferredTimezone = DEFAULT_TIME_ZONE;
        return preference;
    }

    public boolean isPublicationEmail() {
        return publicationEmail;
    }

    public String getPreferredTimezone() {
        return preferredTimezone;
    }
}
