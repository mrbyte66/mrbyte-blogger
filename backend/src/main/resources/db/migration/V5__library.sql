create table library_lock (user_id uuid primary key references app_user(id) on delete cascade);
create table collection (
 id uuid primary key, user_id uuid not null references app_user(id) on delete cascade,
 name varchar(60) not null, normalized_name varchar(60) not null, is_default boolean not null default false,
 version bigint not null default 0, unique(user_id,normalized_name), unique(user_id,id)
);
create unique index one_default_collection on collection(user_id) where is_default;
create table bookmark (
 user_id uuid not null references app_user(id) on delete cascade, article_id uuid not null references article(id),
 collection_id uuid not null, saved_at timestamptz not null, version bigint not null default 0,
 primary key(user_id,article_id), foreign key(user_id,collection_id) references collection(user_id,id)
);
create index bookmark_order on bookmark(user_id,saved_at,article_id);
create index bookmark_collection on bookmark(user_id,collection_id);

-- Read-only cross-module projection never contains draft/private editorial metadata.
create view public_article_catalog as
select a.id,a.display_date,r.content->>'title' as title,r.content->>'abstract' as abstract,
 coalesce((select string_agg(c.name,' ') from article_category ac join category c on c.id=ac.category_id where ac.article_id=a.id),'') as category_names
from article a join article_revision r on r.id=a.current_revision_id where a.status='published' and a.visibility='public';
