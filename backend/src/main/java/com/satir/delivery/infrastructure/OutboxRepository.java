package com.satir.delivery.infrastructure;

import java.time.Clock;
import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class OutboxRepository {
    private final JdbcClient jdbc;private final Clock clock;
    public OutboxRepository(JdbcClient jdbc,Clock clock){this.jdbc=jdbc;this.clock=clock;}
    public void enqueue(String type,UUID aggregate,String key){
        jdbc.sql("insert into outbox_job(id,type,aggregate_id,dedupe_key,state,available_at,created_at) values (?,?,?,?,'PENDING',?,?)").params(UUID.randomUUID(),type,aggregate,key,Timestamp.from(clock.instant()),Timestamp.from(clock.instant())).update();
    }
    public record Job(UUID id,String type,UUID aggregateId,String key,int attempts){}
    @Transactional public Optional<Job> claim() {
        return jdbc.sql("""
            update outbox_job set state='PROCESSING',attempts=attempts+1,lease_until=? where id=(
                select id from outbox_job where (state='PENDING' and available_at<=?) or (state='PROCESSING' and lease_until<=?)
                order by available_at,id for update skip locked limit 1
            ) returning id,type,aggregate_id,dedupe_key,attempts
            """).params(Timestamp.from(clock.instant().plusSeconds(60)),Timestamp.from(clock.instant()),Timestamp.from(clock.instant()))
            .query((r,n) -> new Job(r.getObject("id",UUID.class),r.getString("type"),r.getObject("aggregate_id",UUID.class),r.getString("dedupe_key"),r.getInt("attempts"))).optional();
    }
    @Transactional public void complete(Job job,boolean sent) {
        jdbc.sql("update outbox_job set state=?,lease_until=null,last_error_code=null where id=? and state='PROCESSING' and attempts=?")
            .params(sent?"SENT":"SKIPPED",job.id(),job.attempts()).update();

    }
    @Transactional public void fail(Job job) {
        long delay=Math.min(3600,60L*(1L<<Math.min(job.attempts(),6)));
        jdbc.sql("update outbox_job set state=?,available_at=?,lease_until=null,last_error_code='DELIVERY_FAILED' where id=? and state='PROCESSING' and attempts=?")
            .params(job.attempts()>=8?"FAILED":"PENDING",Timestamp.from(clock.instant().plusSeconds(delay)),job.id(),job.attempts()).update();
    }
    public record Summary(UUID id,UUID aggregateId,String state,int attempts,java.time.Instant createdAt,String errorCode,String articleTitle){}
    public Object publications(int page,int size,String state,String query) {
        String filter=" from delivery_publication_catalog where (cast(? as text) is null or state=?) and (cast(? as text) is null or position(lower(cast(? as text) collate satir_turkish) in lower(coalesce(article_title, '') collate satir_turkish)) > 0)";
        var params=java.util.Arrays.asList(state,state,query,query);long total=jdbc.sql("select count(*)"+filter).params(params).query(Long.class).single();
        var values=new java.util.ArrayList<Object>(params);values.add(size);values.add(page*size);
        var items=jdbc.sql("select id,aggregate_id,state,attempts,created_at,last_error_code,article_title"+filter+" order by created_at desc,id limit ? offset ?").params(values).query((r,n)->new Summary(r.getObject("id",UUID.class),r.getObject("aggregate_id",UUID.class),r.getString("state"),r.getInt("attempts"),r.getTimestamp("created_at").toInstant(),r.getString("last_error_code"),r.getString("article_title"))).list();
        return java.util.Map.of("items",items,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort","created_desc");
    }
    public Optional<Job> failedPublication(UUID id) {return jdbc.sql("select id,type,aggregate_id,dedupe_key,attempts from outbox_job where id=? and type='PUBLICATION' and state='FAILED' for update").param(id).query((r,n)->new Job(r.getObject("id",UUID.class),r.getString("type"),r.getObject("aggregate_id",UUID.class),r.getString("dedupe_key"),r.getInt("attempts"))).optional();}
    public void retry(UUID id,boolean eligible){jdbc.sql("update outbox_job set state=?,attempts=0,lease_until=null,available_at=?,last_error_code=null where id=? and state='FAILED'").params(eligible?"PENDING":"SKIPPED",Timestamp.from(clock.instant()),id).update();}
}
