package com.satir.identity.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository
public class SessionManagementRepository {
    private final JdbcClient jdbc;
    public SessionManagementRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record SessionView(UUID id,boolean current,String deviceLabel,Instant createdAt,Instant lastSeenAt,Instant expiresAt){}
    public List<SessionView> list(UUID user,String currentId){
        return jdbc.sql("select primary_id,session_id,creation_time,last_access_time,expiry_time from spring_session where principal_name=? order by creation_time desc,primary_id").param(user.toString())
            .query((r,n)->new SessionView(UUID.fromString(r.getString("primary_id")),currentId.equals(r.getString("session_id")),"Tarayıcı oturumu",Instant.ofEpochMilli(r.getLong("creation_time")),Instant.ofEpochMilli(r.getLong("last_access_time")),Instant.ofEpochMilli(r.getLong("expiry_time")))).list();
    }
    public boolean delete(UUID user,UUID id){return jdbc.sql("delete from spring_session where principal_name=? and primary_id=?").params(user.toString(),id.toString()).update()>0;}
    public void revokeOthers(UUID user,String currentId){jdbc.sql("delete from spring_session where principal_name=? and session_id<>?").params(user.toString(),currentId).update();}
}
