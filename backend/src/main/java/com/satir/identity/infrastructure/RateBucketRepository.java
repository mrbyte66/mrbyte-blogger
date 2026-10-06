package com.satir.identity.infrastructure;

import java.time.Instant;
import java.sql.Timestamp;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository
public class RateBucketRepository {
    private final JdbcClient jdbc;
    public RateBucketRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Bucket(int attempts,Instant expiresAt){}
    public Bucket increment(String hash,Instant now,Instant end){
        return jdbc.sql("""
            insert into auth_rate_bucket(key_hash,attempts,expires_at) values (?,1,?)
            on conflict(key_hash) do update set attempts=case when auth_rate_bucket.expires_at<=? then 1 else auth_rate_bucket.attempts+1 end,
            expires_at=case when auth_rate_bucket.expires_at<=? then excluded.expires_at else auth_rate_bucket.expires_at end returning attempts,expires_at
            """).params(hash,Timestamp.from(end),Timestamp.from(now),Timestamp.from(now)).query((r,n)->new Bucket(r.getInt("attempts"),r.getTimestamp("expires_at").toInstant())).single();
    }
}
