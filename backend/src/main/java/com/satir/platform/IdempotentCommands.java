package com.satir.platform;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.HexFormat;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class IdempotentCommands {
    private final JdbcClient jdbc;private final ObjectMapper mapper;private final Clock clock;
    public IdempotentCommands(JdbcClient jdbc,ObjectMapper mapper,Clock clock){this.jdbc=jdbc;this.mapper=mapper;this.clock=clock;}
    @Transactional public JsonNode execute(String principal,String route,String key,Object request,Supplier<?> action){
        UUID id;try{id=UUID.fromString(key);}catch(IllegalArgumentException|NullPointerException e){throw new ApiException(422,"IDEMPOTENCY_KEY_REQUIRED");}
        String json=mapper.writeValueAsString(request);String hash;
        try{hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException("SHA-256 unavailable");}
        jdbc.sql("delete from idempotency_record where principal_key=? and route=? and key=? and expires_at<=?").params(principal,route,id,Timestamp.from(clock.instant())).update();
        jdbc.sql("insert into idempotency_record(principal_key,route,key,request_hash,expires_at) values (?,?,?,?,?) on conflict do nothing").params(principal,route,id,hash,Timestamp.from(clock.instant().plusSeconds(86400))).update();
        var record=jdbc.sql("select request_hash,result::text from idempotency_record where principal_key=? and route=? and key=? for update").params(principal,route,id).query((r,n)->new Stored(r.getString(1),r.getString(2))).single();
        if(!record.hash().equals(hash))throw new ApiException(409,"IDEMPOTENCY_KEY_CONFLICT");
        if(record.result()!=null)return mapper.readTree(record.result());
        JsonNode result=mapper.valueToTree(action.get());
        jdbc.sql("update idempotency_record set result=?::jsonb where principal_key=? and route=? and key=?").params(mapper.writeValueAsString(result),principal,route,id).update();return result;
    }
    private record Stored(String hash,String result){}
}
