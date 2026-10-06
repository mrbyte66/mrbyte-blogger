create table site_settings (
 id integer primary key check(id=1), author_public_name varchar(80) not null,
 seo jsonb not null, indexing_enabled boolean not null default false, version bigint not null default 0,
 updated_at timestamptz not null default now()
);
create table theme_revision (id uuid primary key, payload jsonb not null, created_at timestamptz not null);
create table theme_workspace (
 id integer primary key check(id=1), draft_revision_id uuid not null references theme_revision(id),
 applied_revision_id uuid not null references theme_revision(id), version bigint not null default 0
);
insert into site_settings(id,author_public_name,seo) values (1,'', '{"title":null,"description":null,"indexable":true}');
insert into theme_revision values ('00000000-0000-0000-0000-000000000001',
 '{"schemaVersion":1,"name":"Başlangıç","siteName":"SATIR","accent":"#c8efbc","typography":"modern","surface":"paper","width":"reading","spacing":"airy","blocks":[]}',now());
insert into theme_workspace values (1,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',0);

-- Editorial-owned, public-only read model consumed by the site sitemap projection.
create view editorial_indexable_urls as
select '/yazilar/'||a.slug as path,a.public_modified_at as last_modified from article a join article_revision r on r.id=a.current_revision_id
where a.status='published' and a.visibility='public' and (r.content->'seo'->>'indexable')::boolean
union all
select '/seriler/'||s.slug,greatest(s.updated_at,max(a.public_modified_at)) from series s join series_chapter sc on sc.series_id=s.id join article a on a.id=sc.article_id
where s.status='published' and (s.content->'seo'->>'indexable')::boolean and a.status='published' and a.visibility='public' group by s.id;
