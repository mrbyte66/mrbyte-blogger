alter table action_token add column delivery_secret bytea;
create table outbox_job (
    id uuid primary key,
    type varchar(30) not null,
    aggregate_id uuid not null,
    generation bigint not null default 0,
    dedupe_key varchar(200) not null unique,
    state varchar(15) not null check(state in ('PENDING','PROCESSING','SENT','SKIPPED','FAILED')),
    attempts integer not null default 0,
    available_at timestamptz not null,
    lease_until timestamptz,
    last_error_code varchar(60),
    created_at timestamptz not null
);
create index outbox_due on outbox_job(state,available_at);
