-- Media module: owner uploads and licensed provider images. Files live outside the web root;
-- storage keys never appear in public DTOs.
CREATE TABLE media_asset (
    id               UUID         PRIMARY KEY,
    storage_key      VARCHAR(120) NOT NULL,
    state            VARCHAR(16)  NOT NULL,
    mime             VARCHAR(64),
    size_bytes       BIGINT,
    width            INT,
    height           INT,
    sha256           VARCHAR(64),
    source_provider  VARCHAR(32)  NOT NULL,
    source_id        VARCHAR(100),
    source_url       VARCHAR(500),
    photographer     VARCHAR(200),
    photographer_url VARCHAR(500),
    license_url      VARCHAR(500),
    error_code       VARCHAR(64),
    created_by       UUID         NOT NULL REFERENCES app_user (id),
    created_at       TIMESTAMPTZ  NOT NULL,
    CONSTRAINT media_asset_storage_key_uq UNIQUE (storage_key),
    CONSTRAINT media_asset_state_ck CHECK (state IN ('QUARANTINED', 'READY', 'FAILED')),
    CONSTRAINT media_asset_provider_ck CHECK (source_provider IN ('UPLOAD', 'PEXELS'))
);

ALTER TABLE article_revision ADD CONSTRAINT article_revision_cover_fk
    FOREIGN KEY (cover_asset_id) REFERENCES media_asset (id);
ALTER TABLE series ADD CONSTRAINT series_cover_fk
    FOREIGN KEY (cover_asset_id) REFERENCES media_asset (id);

-- Media used by each immutable revision. Only the current revision of a public article grants
-- public access; older revisions never do.
CREATE TABLE article_media_ref (
    revision_id UUID        NOT NULL REFERENCES article_revision (id) ON DELETE CASCADE,
    article_id  UUID        NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    asset_id    UUID        NOT NULL REFERENCES media_asset (id),
    usage       VARCHAR(16) NOT NULL,
    CONSTRAINT article_media_ref_pk PRIMARY KEY (revision_id, asset_id, usage),
    CONSTRAINT article_media_ref_usage_ck CHECK (usage IN ('COVER', 'BODY'))
);
CREATE INDEX article_media_ref_asset_idx ON article_media_ref (asset_id);

-- Provider search results for the owner's explicit cover choice.
CREATE TABLE cover_job (
    id            UUID        PRIMARY KEY,
    resource_type VARCHAR(16) NOT NULL,
    resource_id   UUID        NOT NULL,
    state         VARCHAR(16) NOT NULL,
    candidates    JSONB       NOT NULL,
    error_code    VARCHAR(64),
    created_by    UUID        NOT NULL REFERENCES app_user (id),
    created_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT cover_job_type_ck CHECK (resource_type IN ('ARTICLE', 'SERIES')),
    CONSTRAINT cover_job_state_ck CHECK (state IN ('DONE', 'FAILED'))
);
