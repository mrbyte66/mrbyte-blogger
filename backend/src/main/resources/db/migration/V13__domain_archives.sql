create table domain_archive_job (
 id uuid primary key, owner_id uuid not null references app_user(id), kind text not null check(kind in ('EXPORT','IMPORT')),
 state text not null check(state in ('PENDING','READY','INVALID','COMMITTING','COMMITTED','FAILED')),
 version bigint not null default 0, sha256 text, result jsonb not null default '{}'::jsonb,
 created_at timestamptz not null, expires_at timestamptz not null
);
create index domain_archive_expiry on domain_archive_job(expires_at);
create table article_import_provenance (
 article_id uuid primary key references article(id), source_id uuid not null,
 source_created_at timestamptz not null, imported_at timestamptz not null
);
