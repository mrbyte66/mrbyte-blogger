create table anonymous_actor (
 id uuid primary key, secret_hash varchar(64) not null unique, expires_at timestamptz not null
);
create table article_clap (
 id uuid primary key, article_id uuid not null references article(id),
 user_id uuid references app_user(id) on delete cascade,
 anonymous_actor_id uuid references anonymous_actor(id) on delete cascade,
 created_at timestamptz not null,
 check ((user_id is null) <> (anonymous_actor_id is null))
);
create unique index member_clap on article_clap(article_id,user_id) where user_id is not null;
create unique index anonymous_clap on article_clap(article_id,anonymous_actor_id) where anonymous_actor_id is not null;
create table impression_receipt (
 event_id uuid primary key, article_id uuid not null references article(id), actor_key_hash varchar(64) not null,
 source varchar(12) not null check(source in ('card','permalink')), page_view_id uuid not null,
 occurred_at timestamptz not null, received_at timestamptz not null, request_hash varchar(64) not null
);
create index impression_receipt_retention on impression_receipt(received_at);

create table engagement_lock (actor_key_hash varchar(64) primary key);
create table impression_page_receipt (
 actor_key_hash varchar(64) not null, article_id uuid not null references article(id), source varchar(12) not null,
 page_view_id uuid not null, received_at timestamptz not null,
 primary key(actor_key_hash,article_id,source,page_view_id)
);
create index impression_page_retention on impression_page_receipt(received_at);
