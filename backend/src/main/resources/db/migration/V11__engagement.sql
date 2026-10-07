-- Slice 7: anonymous/member claps and deduplicated view counting.

-- Random cookie identity for anonymous claps. Only a SHA-256 of the secret is stored; no fingerprinting.
CREATE TABLE anonymous_actor (
    id          UUID        PRIMARY KEY,
    secret_hash VARCHAR(64) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT anonymous_actor_secret_uq UNIQUE (secret_hash)
);
CREATE INDEX anonymous_actor_expiry_idx ON anonymous_actor (expires_at);

-- One active clap per actor and article; the target-state PUT makes retries harmless.
CREATE TABLE article_clap (
    id                 UUID        PRIMARY KEY,
    article_id         UUID        NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    user_id            UUID        REFERENCES app_user (id) ON DELETE CASCADE,
    anonymous_actor_id UUID        REFERENCES anonymous_actor (id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL,
    CONSTRAINT article_clap_actor_ck CHECK ((user_id IS NULL) <> (anonymous_actor_id IS NULL))
);
CREATE UNIQUE INDEX article_clap_member_uq ON article_clap (article_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX article_clap_anonymous_uq ON article_clap (article_id, anonymous_actor_id) WHERE anonymous_actor_id IS NOT NULL;
CREATE INDEX article_clap_article_idx ON article_clap (article_id);

-- Retry and duplicate-impression guard; short retention (30 days).
CREATE TABLE impression_receipt (
    event_id        UUID        PRIMARY KEY,
    article_id      UUID        NOT NULL REFERENCES article (id) ON DELETE CASCADE,
    actor_key_hash  VARCHAR(64) NOT NULL,
    source          VARCHAR(16) NOT NULL,
    page_view_id    UUID        NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL,
    counted         BOOLEAN     NOT NULL,
    CONSTRAINT impression_source_ck CHECK (source IN ('CARD', 'PERMALINK'))
);
-- Only counted receipts reserve the (actor, article, source, page view) slot.
CREATE UNIQUE INDEX impression_receipt_slot_uq ON impression_receipt (actor_key_hash, article_id, source, page_view_id) WHERE counted;
CREATE INDEX impression_receipt_expiry_idx ON impression_receipt (received_at);

CREATE TABLE article_totals (
    article_id UUID   PRIMARY KEY REFERENCES article (id) ON DELETE CASCADE,
    views      BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT article_totals_views_ck CHECK (views >= 0)
);
