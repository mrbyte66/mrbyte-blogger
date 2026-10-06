create table external_identity (
    user_id uuid not null references app_user(id),
    provider varchar(20) not null check(provider='google'),
    subject varchar(255) not null,
    connected_at timestamptz not null,
    primary key(provider,subject),
    unique(user_id,provider)
);
create table google_attempt (
    id uuid primary key,
    user_id uuid references app_user(id),
    authentication_generation bigint,
    purpose varchar(10) not null check(purpose in ('login','reauth','link')),
    return_to varchar(100) not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    check ((purpose='login' and user_id is null) or (purpose<>'login' and user_id is not null and authentication_generation is not null))
);
create index google_attempt_expiry_idx on google_attempt(expires_at);
