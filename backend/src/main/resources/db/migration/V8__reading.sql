create table annotation (
 id uuid not null, user_id uuid not null references app_user(id), article_id uuid not null references article(id),
 revision_id uuid not null, kind varchar(12) not null check(kind in ('highlight','underline','note')),
 fragments jsonb not null, note varchar(4000) not null, created_at timestamptz not null,
 version bigint not null default 0, primary key(user_id,article_id,id),
 foreign key(article_id,revision_id) references article_revision(article_id,id)
);
create table article_visit (
 user_id uuid not null references app_user(id), article_id uuid not null references article(id),
 last_visited_at timestamptz not null, primary key(user_id,article_id)
);
create index article_visit_order on article_visit(user_id,last_visited_at desc,article_id);
create table visit_receipt (
 user_id uuid not null references app_user(id), event_id uuid not null, request_hash varchar(64) not null,
 received_at timestamptz not null, primary key(user_id,event_id)
);
