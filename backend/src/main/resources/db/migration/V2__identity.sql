-- Identity module: accounts, password credentials and account preferences.
CREATE TABLE app_user (
    id               UUID         PRIMARY KEY,
    email            VARCHAR(254),
    email_normalized VARCHAR(254),
    owner_username   VARCHAR(32),
    display_name     VARCHAR(80),
    avatar_key       VARCHAR(40),
    role             VARCHAR(16)  NOT NULL,
    status           VARCHAR(16)  NOT NULL,
    verified_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT app_user_role_ck CHECK (role IN ('OWNER', 'MEMBER')),
    CONSTRAINT app_user_status_ck CHECK (status IN ('PENDING', 'ACTIVE', 'DELETED')),
    -- Deleted accounts are tombstones without identity data.
    CONSTRAINT app_user_identity_ck CHECK (
        status = 'DELETED'
        OR (email IS NOT NULL AND email_normalized IS NOT NULL AND display_name IS NOT NULL)),
    CONSTRAINT app_user_username_owner_only_ck CHECK (owner_username IS NULL OR role = 'OWNER'),
    CONSTRAINT app_user_owner_verified_ck CHECK (role <> 'OWNER' OR verified_at IS NOT NULL),
    CONSTRAINT app_user_email_normalized_uq UNIQUE (email_normalized),
    CONSTRAINT app_user_owner_username_uq UNIQUE (owner_username)
);

-- V1 is a single-site product: at most one OWNER can exist.
CREATE UNIQUE INDEX app_user_single_owner_uq ON app_user (role) WHERE role = 'OWNER';

CREATE TABLE password_credential (
    user_id       UUID         PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    changed_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE user_preference (
    user_id            UUID        PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    publication_email  BOOLEAN     NOT NULL DEFAULT TRUE,
    preferred_timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Istanbul'
);
