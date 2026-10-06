create table media_asset (
 id uuid primary key, created_by uuid not null references app_user(id), storage_key varchar(80) not null unique,
 state varchar(20) not null check(state in ('READY','FAILED','QUARANTINED')),
 mime varchar(80) not null, size bigint not null check(size>0), width integer not null check(width>0), height integer not null check(height>0),
 sha256 varchar(64) not null, created_at timestamptz not null
);
create table article_media_ref (
 article_id uuid not null, revision_id uuid not null, asset_id uuid not null references media_asset(id), usage varchar(12) not null check(usage in ('COVER','BODY')),
 primary key(article_id,revision_id,asset_id,usage),foreign key(article_id,revision_id) references article_revision(article_id,id)
);
create index article_media_lookup on article_media_ref(asset_id);
create table series_media_ref (
 series_id uuid not null references series(id), asset_id uuid not null references media_asset(id),
 primary key(series_id,asset_id)
);
