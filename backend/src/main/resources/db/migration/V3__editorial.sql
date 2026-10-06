create table category(id uuid primary key,slug varchar(100) not null unique,name varchar(80) not null,version bigint not null default 0);
create table article (
    id uuid primary key,
    owner_id uuid not null references app_user(id),
    slug varchar(100) not null unique,
    current_revision_id uuid,
    status varchar(16) not null check(status in ('draft','scheduled','published','archived','trashed')),
    visibility varchar(10) not null check(visibility in ('public','private')),
    display_date date not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    first_published_at timestamptz,
    last_published_at timestamptz,
    public_modified_at timestamptz,
    scheduled_at timestamptz,
    schedule_zone varchar(80),
    publication_generation bigint not null default 0,
    schedule_generation bigint not null default 0,
    version bigint not null default 0,
    check(visibility <> 'private' or status not in ('scheduled','published')),
    check((status='scheduled')=(scheduled_at is not null)),
    check((scheduled_at is null)=(schedule_zone is null))
);
create table article_revision (
    id uuid primary key,
    article_id uuid not null references article(id),
    content jsonb not null,
    created_at timestamptz not null,
    unique(article_id,id)
);
alter table article add constraint own_revision foreign key(id,current_revision_id) references article_revision(article_id,id);
create table article_category(article_id uuid not null references article(id),category_id uuid not null references category(id),position integer not null check(position>=0),primary key(article_id,category_id),unique(article_id,position));
create table article_slug(slug varchar(100) primary key,article_id uuid not null references article(id));
create index article_public_list on article(display_date desc,id desc) where status='published' and visibility='public';
create index article_due on article(scheduled_at,id) where status='scheduled';
create index article_categories_filter on article_category(category_id,article_id);
create table article_totals(article_id uuid primary key references article(id),views bigint not null default 0 check(views>=0));
create table idempotency_record(
    principal_key varchar(100) not null,
    route varchar(200) not null,
    key uuid not null,
    request_hash char(64) not null,
    result jsonb,
    expires_at timestamptz not null,
    primary key(principal_key,route,key)
);
