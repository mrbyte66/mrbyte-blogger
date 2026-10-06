package com.satir.identity.infrastructure;

import com.satir.platform.ApiException;
import com.satir.platform.AccountDataRemoval;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class GoogleRepository implements AccountDataRemoval {
    private final JdbcClient jdbc;
    public GoogleRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Attempt(UUID id,UUID user,Long generation,String purpose,String returnTo,Instant expiry){}
    public void attempt(Attempt a){jdbc.sql("insert into google_attempt(id,user_id,authentication_generation,purpose,return_to,expires_at) values (?,?,?,?,?,?)").params(a.id(),a.user(),a.generation(),a.purpose(),a.returnTo(),Timestamp.from(a.expiry())).update();}
    @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public Attempt consume(UUID id,Instant now){return jdbc.sql("update google_attempt set consumed_at=? where id=? and consumed_at is null and expires_at>? returning *").params(Timestamp.from(now),id,Timestamp.from(now)).query((r,n)->new Attempt(r.getObject("id",UUID.class),r.getObject("user_id",UUID.class),(Long)r.getObject("authentication_generation"),r.getString("purpose"),r.getString("return_to"),r.getTimestamp("expires_at").toInstant())).optional().orElseThrow(()->new ApiException(422,"INVALID_OAUTH_STATE"));}
    public Optional<UUID> user(String subject){return jdbc.sql("select user_id from external_identity where provider='google' and subject=?").param(subject).query(UUID.class).optional();}
    public boolean insert(UUID user,String subject,Instant now){return jdbc.sql("insert into external_identity values (?,'google',?,?) on conflict do nothing").params(user,subject,Timestamp.from(now)).update()==1;}
    public boolean createMember(UUID id,String email,String name,Instant now){int inserted=jdbc.sql("insert into app_user(id,name,email,role,status,created_at) values (?,?,?,'MEMBER','ACTIVE',?) on conflict(email) do nothing").params(id,name,email,Timestamp.from(now)).update();if(inserted==0)return false;jdbc.sql("insert into user_preference(user_id) values (?)").param(id).update();return true;}
    public List<Map<String,Object>> connections(UUID user){return jdbc.sql("select provider,connected_at from external_identity where user_id=?").param(user).query((r,n)->Map.<String,Object>of("provider",r.getString("provider"),"connectedAt",r.getTimestamp("connected_at").toInstant())).list();}
    public void unlink(UUID user){if(!connections(user).isEmpty()&&!jdbc.sql("select exists(select 1 from password_credential where user_id=?)").param(user).query(Boolean.class).single())throw new ApiException(409,"LAST_LOGIN_METHOD");jdbc.sql("delete from external_identity where user_id=? and provider='google'").param(user).update();}
    public void removeFor(UUID user){jdbc.sql("delete from google_attempt where user_id=?").param(user).update();jdbc.sql("delete from external_identity where user_id=?").param(user).update();}
}
