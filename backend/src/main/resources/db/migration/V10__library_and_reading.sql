-- Slice 6: private member library (collections, bookmarks), annotations and visit history.
-- Everything here is personal: every query is scoped by user_id taken from the server session.

CREATE TABLE collection (
    id              UUID        PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    name            VARCHAR(60) NOT NULL,
    normalized_name VARCHAR(60) NOT NULL,
    is_default      BOOLEAN     NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    version         BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT collection_owner_uq UNIQUE (id, user_id),
    CONSTRAINT collection_name_uq UNIQUE (user_id, normalized_name)
);
-- Exactly one immutable default ("Genel") per account.
CREATE UNIQUE INDEX collection_default_uq ON collection (user_id) WHERE is_default;

CREATE TABLE bookmark (
    user_id       UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    article_id    UUID        NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    collection_id UUID        NOT NULL,
    saved_at      TIMESTAMPTZ NOT NULL,
    version       BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT bookmark_pk PRIMARY KEY (user_id, article_id),
    -- The collection must belong to the same account.
    CONSTRAINT bookmark_collection_fk FOREIGN KEY (collection_id, user_id) REFERENCES collection (id, user_id)
);
CREATE INDEX bookmark_saved_idx ON bookmark (user_id, saved_at, article_id);
CREATE INDEX bookmark_article_idx ON bookmark (article_id);

-- Mark IDs are client-generated UUIDs, unique per account only, so guessing another member's ID reveals nothing.
CREATE TABLE annotation (
    user_id     UUID          NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    id          UUID          NOT NULL,
    article_id  UUID          NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    revision_id UUID          NOT NULL,
    kind        VARCHAR(16)   NOT NULL,
    fragments   JSONB         NOT NULL,
    note        VARCHAR(4000) NOT NULL,
    import_key  VARCHAR(120),
    created_at  TIMESTAMPTZ   NOT NULL,
    updated_at  TIMESTAMPTZ   NOT NULL,
    version     BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT annotation_pk PRIMARY KEY (user_id, id),
    CONSTRAINT annotation_kind_ck CHECK (kind IN ('HIGHLIGHT', 'UNDERLINE', 'NOTE')),
    -- The anchored revision must be a revision of the same article.
    CONSTRAINT annotation_revision_fk FOREIGN KEY (revision_id, article_id) REFERENCES article_revision (id, article_id),
    CONSTRAINT annotation_import_uq UNIQUE (user_id, import_key)
);
CREATE INDEX annotation_article_idx ON annotation (user_id, article_id);

-- Guest-note imports: the same clientImportId replays the stored report; a different body is a conflict.
CREATE TABLE annotation_import (
    user_id          UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    client_import_id UUID        NOT NULL,
    request_hash     VARCHAR(64) NOT NULL,
    report           JSONB       NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL,
    CONSTRAINT annotation_import_pk PRIMARY KEY (user_id, client_import_id)
);

-- Last real opening of an article; not completion. Retention: 180 days (see backend README).
CREATE TABLE reading_history (
    user_id          UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    article_id       UUID        NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    last_visited_at  TIMESTAMPTZ NOT NULL,
    last_revision_id UUID        NOT NULL,
    CONSTRAINT reading_history_pk PRIMARY KEY (user_id, article_id)
);
CREATE INDEX reading_history_recent_idx ON reading_history (user_id, last_visited_at DESC, article_id);
CREATE INDEX reading_history_expiry_idx ON reading_history (last_visited_at);
