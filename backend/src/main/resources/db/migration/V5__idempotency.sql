-- Replay store for retried POST commands (API contract §1). The record and the command's effect
-- commit in the same transaction; records expire after 24 hours.
CREATE TABLE idempotency_record (
    principal_key VARCHAR(64)  NOT NULL,
    route         VARCHAR(200) NOT NULL,
    idem_key      UUID         NOT NULL,
    request_hash  VARCHAR(64)  NOT NULL,
    status        INT          NOT NULL,
    body          JSONB,
    created_at    TIMESTAMPTZ  NOT NULL,
    expires_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT idempotency_record_pk PRIMARY KEY (principal_key, route, idem_key)
);
CREATE INDEX idempotency_record_expires_idx ON idempotency_record (expires_at);
