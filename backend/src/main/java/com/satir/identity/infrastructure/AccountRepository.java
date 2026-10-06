package com.satir.identity.infrastructure;

import com.satir.identity.domain.UserAccount;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AccountRepository {
    private final JdbcClient jdbc;
    private static final String SELECT = "select u.*, p.publication_email,p.time_zone from app_user u join user_preference p on p.user_id=u.id ";
    public AccountRepository(JdbcClient jdbc) { this.jdbc = jdbc; }
    private Optional<UserAccount> find(String condition, Object value) {
        return jdbc.sql(SELECT + condition).param(value).query((r,n) -> new UserAccount(r.getObject("id", UUID.class), r.getString("name"), r.getString("email"), r.getString("username"),r.getString("role"), r.getString("status"), r.getString("avatar"),r.getTimestamp("created_at").toInstant(),r.getLong("version"),r.getBoolean("publication_email"),r.getString("time_zone"),r.getLong("authentication_generation"))).optional();
    }
    public Optional<UserAccount> byId(UUID id) { return find("where u.id=?", id); }
    public Optional<UserAccount> lockedByIdentifier(String identifier){return find("where ? in (u.email,u.username) for update of u",identifier);}
    public Optional<UserAccount> byIdentifier(String identifier) { return find("where ? in (u.email,u.username)", identifier); }
    public Optional<UserAccount> byEmail(String email) { return find("where u.email=?", email); }
    public Optional<String> password(UUID id) { return jdbc.sql("select password_hash from password_credential where user_id=?").param(id).query(String.class).optional(); }
    public void create(UserAccount account, String hash, Instant now) {
        jdbc.sql("insert into app_user(id,name,email,username,role,status,created_at) values (?,?,?,?,?,?,?)").params(account.id(),account.name(),account.email(),account.username(),account.role(),account.status(),java.sql.Timestamp.from(now)).update();
        jdbc.sql("insert into password_credential(user_id,password_hash,updated_at) values (?,?,?)").params(account.id(),hash,java.sql.Timestamp.from(now)).update();
        jdbc.sql("insert into user_preference(user_id) values (?)").param(account.id()).update();
    }
    public boolean ownerExists() { return jdbc.sql("select exists(select 1 from app_user where role='OWNER')").query(Boolean.class).single(); }
    public record Member(UUID id,String name,String email,String status,Instant createdAt){}
    public Object members(int page,int size,String q) {
        var sql=" from app_user where role='MEMBER' and status<>'DELETED' and (cast(? as text) is null or position(lower(?) in lower(name||' '||email))>0)";
        var params=java.util.Arrays.asList(q,q);
        long total=jdbc.sql("select count(*)"+sql).params(params).query(Long.class).single();
        var values=new java.util.ArrayList<Object>(params);values.add(size);values.add(page*size);
        var items=jdbc.sql("select id,name,email,status,created_at"+sql+" order by created_at desc,id limit ? offset ?").params(values).query((r,n)->new Member(r.getObject("id",UUID.class),r.getString("name"),r.getString("email"),r.getString("status"),r.getTimestamp("created_at").toInstant())).list();
        return java.util.Map.of("items",items,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort","created_desc");
    }
}
