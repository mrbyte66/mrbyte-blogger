-- Delivery module: transactional outbox. A job row commits with the business change that caused it;
-- workers lease jobs, call providers outside the DB transaction and record the outcome.
CREATE TABLE outbox_job (
    id              UUID         PRIMARY KEY,
    type            VARCHAR(40)  NOT NULL,
    aggregate_id    UUID         NOT NULL,
    generation      BIGINT       NOT NULL,
    dedupe_key      VARCHAR(200) NOT NULL,
    payload         JSONB        NOT NULL,
    state           VARCHAR(16)  NOT NULL,
    attempts        INT          NOT NULL DEFAULT 0,
    available_at    TIMESTAMPTZ  NOT NULL,
    lease_until     TIMESTAMPTZ,
    last_error_code VARCHAR(64),
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT outbox_job_dedupe_uq UNIQUE (dedupe_key),
    CONSTRAINT outbox_job_state_ck CHECK (state IN ('PENDING', 'RUNNING', 'DONE', 'SKIPPED', 'FAILED'))
);
CREATE INDEX outbox_job_ready_idx ON outbox_job (state, available_at);
CREATE INDEX outbox_job_created_idx ON outbox_job (created_at);
