-- Fixed-window abuse buckets. key_hash is an HMAC of the logical key; raw IPs/identifiers are not stored.
CREATE TABLE auth_rate_bucket (
    key_hash     VARCHAR(64) PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    count        INT         NOT NULL CHECK (count >= 0),
    expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX auth_rate_bucket_expires_idx ON auth_rate_bucket (expires_at);

-- Security/publication audit trail. Never stores content, passwords, tokens or e-mail bodies.
-- actor_id has no FK so the trail survives account deletion.
CREATE TABLE audit_event (
    id            UUID        PRIMARY KEY,
    actor_id      UUID,
    action        VARCHAR(64) NOT NULL,
    resource_kind VARCHAR(32),
    resource_id   UUID,
    outcome       VARCHAR(16) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'DENIED')),
    request_id    VARCHAR(64),
    created_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX audit_event_created_idx ON audit_event (created_at);
