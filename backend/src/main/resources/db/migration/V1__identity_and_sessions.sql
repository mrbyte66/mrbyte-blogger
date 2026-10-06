create table app_user (
    id uuid primary key,
    name varchar(80) not null,
    email varchar(254) not null unique check (email=lower(btrim(email))),
    username varchar(80) unique,
    role varchar(10) not null check(role in ('OWNER','MEMBER')),
    status varchar(16) not null check(status in ('PENDING','ACTIVE')),
    avatar varchar(60) not null default 'initials',
    created_at timestamptz not null,
    version bigint not null default 0,
    check(username is null or role='OWNER')
);
create unique index one_owner on app_user(role) where role='OWNER';
create table password_credential (
    user_id uuid primary key references app_user(id) on delete cascade,
    password_hash varchar(512) not null,
    updated_at timestamptz not null
);
create table user_preference (
    user_id uuid primary key references app_user(id) on delete cascade,
    publication_email boolean not null default true,
    time_zone varchar(80) not null default 'Europe/Istanbul'
);
create table action_token (
    id uuid primary key,
    user_id uuid not null references app_user(id) on delete cascade,
    purpose varchar(20) not null check(purpose in ('VERIFY','RESET','EMAIL_CHANGE')),
    token_hash char(64) not null unique,
    expires_at timestamptz not null,
    consumed_at timestamptz
);
create table auth_rate_bucket (
    key_hash char(64) primary key,
    attempts integer not null check(attempts >= 0),
    expires_at timestamptz not null
);
create index auth_rate_expiry on auth_rate_bucket(expires_at);
create table spring_session (
    primary_id char(36) primary key,
    session_id char(36) not null unique,
    creation_time bigint not null,
    last_access_time bigint not null,
    max_inactive_interval integer not null,
    expiry_time bigint not null,
    principal_name varchar(100)
);
create index spring_session_expiry on spring_session(expiry_time);
create index spring_session_principal on spring_session(principal_name);
create table spring_session_attributes (
    session_primary_id char(36) not null references spring_session(primary_id) on delete cascade,
    attribute_name varchar(200) not null,
    attribute_bytes bytea not null,
    primary key(session_primary_id,attribute_name)
);
