alter table action_token add column encrypted_target_email bytea;
alter table app_user alter column email drop not null;
alter table app_user drop constraint app_user_status_check;
alter table app_user add constraint app_user_status_check check(status in ('PENDING','ACTIVE','DELETED'));
alter table app_user add column deleted_at timestamptz;
alter table app_user add constraint deleted_user_anonymous check(status<>'DELETED' or (role='MEMBER' and email is null and username is null and name='Silinen kullanıcı'));
create table account_deletion_journal (user_id uuid primary key, deleted_at timestamptz not null);

alter table app_user add column authentication_generation bigint not null default 0;
