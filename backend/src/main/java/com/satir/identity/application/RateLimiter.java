package com.satir.identity.application;

import com.satir.platform.ApiException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RateLimiter {
    private final com.satir.identity.infrastructure.RateBucketRepository buckets; private final Clock clock; private final byte[] secret;
    public RateLimiter(com.satir.identity.infrastructure.RateBucketRepository buckets, Clock clock, @Value("${satir.rate-secret}") String secret) {
        if (secret.length()<32) throw new IllegalStateException("RATE_HMAC_SECRET must contain at least 32 characters");
        this.buckets=buckets; this.clock=clock; this.secret=secret.getBytes(StandardCharsets.UTF_8);
    }
    @Transactional(propagation=Propagation.REQUIRES_NEW, noRollbackFor=ApiException.class)
    public void check(String actor,int max,Duration window) {
        var now=clock.instant();
        var bucket=buckets.increment(hash(actor),now,now.plus(window));
        if(bucket.attempts()>max)throw new ApiException(429,"RATE_LIMITED",Math.max(1,(Duration.between(now,bucket.expiresAt()).toMillis()+999)/1000));
    }
    private String hash(String value) {
        try { var mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret,"HmacSHA256")); return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.GeneralSecurityException e) { throw new IllegalStateException("HMAC unavailable"); }
    }
}
