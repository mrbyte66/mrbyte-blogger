alter table media_asset add column attribution jsonb;
create table cover_job (
 id uuid primary key, owner_id uuid not null references app_user(id), resource_type varchar(10) not null check(resource_type in ('article','series')),
 resource_id uuid not null, resource_version bigint not null, query varchar(100) not null,
 state varchar(12) not null check(state in ('PENDING','READY','FAILED')), candidates jsonb not null default '[]', error_code varchar(60),
 created_at timestamptz not null, expires_at timestamptz not null
);
create index cover_job_expiry on cover_job(expires_at);
create view delivery_publication_catalog as
 select j.*, r.content->>'title' as article_title from outbox_job j
 left join article a on a.id=j.aggregate_id left join article_revision r on r.id=a.current_revision_id
 where j.type='PUBLICATION';
