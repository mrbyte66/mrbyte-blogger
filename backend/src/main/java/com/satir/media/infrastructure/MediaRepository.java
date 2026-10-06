package com.satir.media.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MediaRepository {
    private final JdbcClient jdbc;
    public MediaRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Asset(UUID id,UUID owner,String storageKey,String state,String mime,long size,int width,int height,String sha256){}
    public Optional<Asset> find(UUID id){return jdbc.sql("select * from media_asset where id=?").param(id).query((r,n)->new Asset(r.getObject("id",UUID.class),r.getObject("created_by",UUID.class),r.getString("storage_key"),r.getString("state"),r.getString("mime"),r.getLong("size"),r.getInt("width"),r.getInt("height"),r.getString("sha256"))).optional();}
    public void create(Asset a,Instant now){jdbc.sql("insert into media_asset(id,created_by,storage_key,state,mime,size,width,height,sha256,created_at) values (?,?,?,?,?,?,?,?,?,?)").params(a.id(),a.owner(),a.storageKey(),a.state(),a.mime(),a.size(),a.width(),a.height(),a.sha256(),Timestamp.from(now)).update();}
    public void delete(UUID id){jdbc.sql("delete from media_asset where id=?").param(id).update();}
    public Optional<String> attribution(UUID id){return jdbc.sql("select attribution::text from media_asset where id=?").param(id).query(String.class).optional();}
    public void attribution(UUID id,String json){jdbc.sql("update media_asset set attribution=?::jsonb where id=?").params(json,id).update();}
}
