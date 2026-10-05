-- Membership: external (Google) identities and single-use action tokens.

CREATE TABLE external_identity (
    id         UUID         PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    provider   VARCHAR(16)  NOT NULL,
    subject    VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    CONSTRAINT external_identity_provider_ck CHECK (provider IN ('GOOGLE')),
    -- The provider subject is the authority; an e-mail match never links accounts automatically.
    CONSTRAINT external_identity_subject_uq UNIQUE (provider, subject),
    CONSTRAINT external_identity_user_uq UNIQUE (user_id, provider)
);

-- Only a SHA-256 of the 256-bit token is stored. EMAIL_CHANGE keeps the new address encrypted.
CREATE TABLE action_token (
    id                     UUID         PRIMARY KEY,
    user_id                UUID         NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    purpose                VARCHAR(16)  NOT NULL,
    token_hash             VARCHAR(64)  NOT NULL,
    encrypted_target_email VARCHAR(600),
    expires_at             TIMESTAMPTZ  NOT NULL,
    consumed_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ  NOT NULL,
    CONSTRAINT action_token_purpose_ck CHECK (purpose IN ('VERIFY', 'RESET', 'EMAIL_CHANGE')),
    CONSTRAINT action_token_hash_uq UNIQUE (token_hash),
    CONSTRAINT action_token_target_ck CHECK ((purpose = 'EMAIL_CHANGE') = (encrypted_target_email IS NOT NULL))
);
CREATE INDEX action_token_expires_idx ON action_token (expires_at);
CREATE INDEX action_token_user_idx ON action_token (user_id, purpose);
