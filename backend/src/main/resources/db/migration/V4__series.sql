-- One lock order for owner editorial commands. Single-writer V1 keeps this deliberately simple.
create table editorial_write_lock (id integer primary key check (id=1));
insert into editorial_write_lock values (1);
create table series (
 id uuid primary key, owner_id uuid not null references app_user(id), slug varchar(100) not null unique,
 content jsonb not null, status varchar(20) not null check(status in ('draft','published','archived','trashed')),
 version bigint not null default 0, created_at timestamptz not null, updated_at timestamptz not null
);
create table series_slug (slug varchar(100) primary key, series_id uuid not null references series(id));
create table series_chapter (
 article_id uuid primary key references article(id), series_id uuid not null references series(id),
 position integer not null check(position>=0), unique(series_id,position)
);
create index series_chapter_order on series_chapter(series_id,position);
-- ICU keeps the editorial title order independent of the host's default database locale.
create collation satir_turkish (provider=icu, locale='tr');
