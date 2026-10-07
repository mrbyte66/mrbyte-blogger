-- Site module: singleton site settings and the theme workspace (draft vs applied immutable revisions).
CREATE TABLE site_settings (
    id                 SMALLINT    PRIMARY KEY,
    author_public_name VARCHAR(80),
    seo                JSONB       NOT NULL,
    indexing_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at         TIMESTAMPTZ NOT NULL,
    version            BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT site_settings_singleton_ck CHECK (id = 1)
);
INSERT INTO site_settings (id, seo, updated_at) VALUES (1, '{}', now());

CREATE TABLE theme_revision (
    id             UUID        PRIMARY KEY,
    schema_version INT         NOT NULL,
    payload        JSONB       NOT NULL,
    created_by     UUID        NOT NULL REFERENCES app_user (id),
    created_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE theme_workspace (
    id                  SMALLINT    PRIMARY KEY,
    draft_revision_id   UUID        REFERENCES theme_revision (id),
    applied_revision_id UUID        REFERENCES theme_revision (id),
    updated_at          TIMESTAMPTZ NOT NULL,
    version             BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT theme_workspace_singleton_ck CHECK (id = 1)
);
INSERT INTO theme_workspace (id, updated_at) VALUES (1, now());
