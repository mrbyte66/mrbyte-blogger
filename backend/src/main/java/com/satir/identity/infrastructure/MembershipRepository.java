package com.satir.identity.infrastructure;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MembershipRepository {
    private final JdbcClient jdbc;
    public MembershipRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public boolean createMember(UUID id,String name,String email,Instant now,String passwordHash) {
        int inserted=jdbc.sql("insert into app_user(id,name,email,role,status,created_at) values (?,?,?,'MEMBER','PENDING',?) on conflict(email) do nothing").params(id,name,email,Timestamp.from(now)).update();
        if(inserted==0)return false;
        jdbc.sql("insert into user_preference(user_id) values (?)").param(id).update();
        jdbc.sql("insert into password_credential values (?,?,?)").params(id,passwordHash,Timestamp.from(now)).update();return true;
    }
    public void createToken(UUID id,UUID user,String purpose,String hash,Instant expires,byte[] secret) {
        jdbc.sql("insert into action_token(id,user_id,purpose,token_hash,expires_at,delivery_secret) values (?,?,?,?,?,?)").params(id,user,purpose,hash,Timestamp.from(expires),secret).update();
    }
    public record TokenOwner(UUID id,UUID userId){}
    public Optional<TokenOwner> lockToken(String hash,String purpose,Instant now) {
        var owner=jdbc.sql("select user_id from action_token where token_hash=? and purpose=?").params(hash,purpose).query(UUID.class).optional();
        if(owner.isEmpty())return Optional.empty();
        jdbc.sql("select id from app_user where id=? for update").param(owner.get()).query(UUID.class).optional();
        return jdbc.sql("select id,user_id from action_token where token_hash=? and purpose=? and consumed_at is null and expires_at>? for update").params(hash,purpose,Timestamp.from(now)).query((r,n) -> new TokenOwner(r.getObject("id",UUID.class),r.getObject("user_id",UUID.class))).optional();
    }
    public boolean lockLive(UUID user){return jdbc.sql("select status from app_user where id=? for update").param(user).query(String.class).optional().filter(s->!s.equals("DELETED")).isPresent();}
    public boolean lockActive(UUID user){return jdbc.sql("select status from app_user where id=? for update").param(user).query(String.class).optional().filter("ACTIVE"::equals).isPresent();}
    public void targetEmail(UUID token,byte[] target){jdbc.sql("update action_token set encrypted_target_email=? where id=?").params(target,token).update();}
    public Optional<byte[]> targetEmail(UUID token){return jdbc.sql("select encrypted_target_email from action_token where id=? and encrypted_target_email is not null").param(token).query(byte[].class).optional();}
    public void changeEmail(UUID user,String email){jdbc.sql("update app_user set email=?,status='ACTIVE',version=version+1,authentication_generation=authentication_generation+1 where id=?").params(email,user).update();}
    public void delete(UUID user,Instant now){
        revokeSessions(user);
        jdbc.sql("delete from action_token where user_id=?").param(user).update();
        jdbc.sql("delete from password_credential where user_id=?").param(user).update();
        jdbc.sql("delete from user_preference where user_id=?").param(user).update();
        jdbc.sql("update app_user set status='DELETED',name='Silinen kullanıcı',email=null,username=null,avatar='initials',created_at=?,deleted_at=?,version=version+1 where id=?").params(Timestamp.from(now),Timestamp.from(now),user).update();
        jdbc.sql("insert into account_deletion_journal values (?,?) on conflict do nothing").params(user,Timestamp.from(now)).update();
    }
    public void activate(UUID user){jdbc.sql("update app_user set status='ACTIVE',version=version+1 where id=?").param(user).update();}
    public void replacePassword(UUID user,String hash,Instant now){jdbc.sql("update app_user set authentication_generation=authentication_generation+1 where id=?").param(user).update();jdbc.sql("insert into password_credential(password_hash,updated_at,user_id) values (?,?,?) on conflict(user_id) do update set password_hash=excluded.password_hash,updated_at=excluded.updated_at").params(hash,Timestamp.from(now),user).update();}
    public void revokeSessions(UUID user){jdbc.sql("delete from spring_session where principal_name=?").param(user.toString()).update();}
    public void consumeTokens(UUID user,String purpose,Instant now){jdbc.sql("update action_token set consumed_at=?,delivery_secret=null,encrypted_target_email=null where user_id=? and purpose=? and consumed_at is null").params(Timestamp.from(now),user,purpose).update();}
    public boolean updateProfile(UUID id,long version,String name,String avatar,Boolean publicationEmail,String timeZone){
        int changed=jdbc.sql("update app_user set name=coalesce(?,name),avatar=coalesce(?,avatar),version=version+1 where id=? and version=? and status='ACTIVE'").params(name,avatar,id,version).update();
        if(changed==0)return false;
        jdbc.sql("update user_preference set publication_email=coalesce(?,publication_email),time_zone=coalesce(?,time_zone) where user_id=?").params(publicationEmail,timeZone,id).update();return true;
    }
    public record TokenDelivery(String purpose,byte[] secret,Instant expiry,String email,byte[] targetEmail){}
    public Optional<TokenDelivery> delivery(UUID id){
        return jdbc.sql("select t.purpose,t.delivery_secret,t.expires_at,u.email,t.encrypted_target_email from action_token t join app_user u on u.id=t.user_id where t.id=? and t.consumed_at is null and t.delivery_secret is not null").param(id)
            .query((r,n) -> new TokenDelivery(r.getString("purpose"),r.getBytes("delivery_secret"),r.getTimestamp("expires_at").toInstant(),r.getString("email"),r.getBytes("encrypted_target_email"))).optional();
    }
}
