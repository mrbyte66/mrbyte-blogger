-- Editorial module: categories, articles with immutable revisions, series membership and slug registry.

CREATE TABLE category (
    id              UUID         PRIMARY KEY,
    slug            VARCHAR(100) NOT NULL,
    name            VARCHAR(80)  NOT NULL,
    name_normalized VARCHAR(80)  NOT NULL,
    position        INT          NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT category_slug_uq UNIQUE (slug),
    CONSTRAINT category_name_uq UNIQUE (name_normalized),
    CONSTRAINT category_slug_ck CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Initial product topics (architecture §3). These are taxonomy, not demo content.
INSERT INTO category (id, slug, name, name_normalized, position, created_at, updated_at) VALUES
    ('7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a01', 'yazilim',  'Yazılım',  'yazılım',  0, now(), now()),
    ('7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a02', 'edebiyat', 'Edebiyat', 'edebiyat', 1, now(), now()),
    ('7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a03', 'kultur',   'Kültür',   'kültür',   2, now(), now());

CREATE TABLE article (
    id                     UUID        PRIMARY KEY,
    owner_id               UUID        NOT NULL REFERENCES app_user (id),
    current_revision_id    UUID        NOT NULL,
    status                 VARCHAR(16) NOT NULL,
    visibility             VARCHAR(16) NOT NULL,
    display_date           DATE        NOT NULL,
    first_published_at     TIMESTAMPTZ,
    last_published_at      TIMESTAMPTZ,
    public_modified_at     TIMESTAMPTZ,
    scheduled_at           TIMESTAMPTZ,
    schedule_zone          VARCHAR(64),
    schedule_generation    BIGINT      NOT NULL DEFAULT 0,
    publication_generation BIGINT      NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL,
    updated_at             TIMESTAMPTZ NOT NULL,
    version                BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT article_status_ck CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'TRASHED')),
    CONSTRAINT article_visibility_ck CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    -- Private writing can never be live or planned.
    CONSTRAINT article_private_unpublished_ck CHECK (visibility = 'PUBLIC' OR status NOT IN ('PUBLISHED', 'SCHEDULED')),
    CONSTRAINT article_schedule_ck CHECK (
        (status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND schedule_zone IS NOT NULL)
        OR (status <> 'SCHEDULED' AND scheduled_at IS NULL AND schedule_zone IS NULL))
);
CREATE INDEX article_public_idx ON article (status, visibility, display_date DESC, id DESC);
CREATE INDEX article_due_idx ON article (status, scheduled_at, id);

CREATE TABLE article_revision (
    id              UUID         PRIMARY KEY,
    article_id      UUID         NOT NULL REFERENCES article (id) DEFERRABLE INITIALLY DEFERRED,
    revision_number INT          NOT NULL,
    title           VARCHAR(200) NOT NULL,
    eyebrow         VARCHAR(160) NOT NULL,
    abstract        TEXT         NOT NULL,
    document        JSONB        NOT NULL,
    presentation    JSONB        NOT NULL,
    seo             JSONB        NOT NULL,
    cover_mode      VARCHAR(16)  NOT NULL,
    cover_asset_id  UUID,
    authored_by     UUID         NOT NULL REFERENCES app_user (id),
    created_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT article_revision_number_uq UNIQUE (article_id, revision_number),
    CONSTRAINT article_revision_owner_uq UNIQUE (id, article_id),
    CONSTRAINT article_revision_cover_ck CHECK (
        (cover_mode = 'MANUAL' AND cover_asset_id IS NOT NULL) OR cover_mode IN ('AUTO', 'NONE'))
);

-- The current revision must belong to the same article.
ALTER TABLE article ADD CONSTRAINT article_current_revision_fk
    FOREIGN KEY (current_revision_id, id) REFERENCES article_revision (id, article_id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE article_category (
    article_id  UUID NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES category (id),
    position    INT  NOT NULL,
    CONSTRAINT article_category_pk PRIMARY KEY (article_id, category_id),
    CONSTRAINT article_category_position_uq UNIQUE (article_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX article_category_category_idx ON article_category (category_id, article_id);

CREATE TABLE series (
    id                 UUID         PRIMARY KEY,
    owner_id           UUID         NOT NULL REFERENCES app_user (id),
    title              VARCHAR(160) NOT NULL,
    summary            VARCHAR(1000) NOT NULL,
    status             VARCHAR(16)  NOT NULL,
    ongoing            BOOLEAN      NOT NULL,
    cover_mode         VARCHAR(16)  NOT NULL,
    cover_asset_id     UUID,
    presentation       JSONB        NOT NULL,
    seo                JSONB        NOT NULL,
    public_modified_at TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL,
    updated_at         TIMESTAMPTZ  NOT NULL,
    version            BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT series_status_ck CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'TRASHED')),
    CONSTRAINT series_cover_ck CHECK (
        (cover_mode = 'MANUAL' AND cover_asset_id IS NOT NULL) OR cover_mode IN ('AUTO', 'NONE'))
);

-- One series per article, including draft/archived/trashed series (membership stays reserved).
CREATE TABLE series_chapter (
    article_id UUID PRIMARY KEY REFERENCES article (id) ON DELETE CASCADE,
    series_id  UUID NOT NULL REFERENCES series (id) ON DELETE CASCADE,
    position   INT  NOT NULL,
    CONSTRAINT series_chapter_position_uq UNIQUE (series_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- Current slug plus retired aliases. Slugs are never reassigned to another resource.
CREATE TABLE slug_registry (
    id         UUID         PRIMARY KEY,
    kind       VARCHAR(16)  NOT NULL,
    slug       VARCHAR(100) NOT NULL,
    article_id UUID REFERENCES article (id) ON DELETE CASCADE,
    series_id  UUID REFERENCES series (id) ON DELETE CASCADE,
    is_current BOOLEAN      NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    CONSTRAINT slug_registry_kind_ck CHECK (kind IN ('ARTICLE', 'SERIES')),
    CONSTRAINT slug_registry_target_ck CHECK (
        (kind = 'ARTICLE' AND article_id IS NOT NULL AND series_id IS NULL)
        OR (kind = 'SERIES' AND series_id IS NOT NULL AND article_id IS NULL)),
    CONSTRAINT slug_registry_slug_ck CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT slug_registry_slug_uq UNIQUE (kind, slug)
);
CREATE UNIQUE INDEX slug_registry_article_current_uq ON slug_registry (article_id) WHERE is_current AND article_id IS NOT NULL;
CREATE UNIQUE INDEX slug_registry_series_current_uq ON slug_registry (series_id) WHERE is_current AND series_id IS NOT NULL;
