package com.satir.media.infrastructure;

import com.satir.media.application.MediaService;
import com.satir.platform.ContentWriteGuard;
import com.satir.platform.RetentionTask;
import java.time.Clock;
import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** Expired candidate files are removed only when no current or retained revision references them. */
@Component
public class CoverRetention implements RetentionTask {
    private final JdbcClient jdbc;
    private final Clock clock;
    private final ObjectMapper mapper;
    private final MediaService media;
    private final ContentWriteGuard guard;
    public CoverRetention(JdbcClient jdbc, Clock clock, ObjectMapper mapper, MediaService media, ContentWriteGuard guard) {
        this.jdbc=jdbc; this.clock=clock; this.mapper=mapper; this.media=media; this.guard=guard;
    }
    @Transactional public void clean() {
        guard.acquire();
        var jobs=jdbc.sql("select id,candidates::text from cover_job where expires_at<=? order by expires_at limit 100 for update")
            .param(Timestamp.from(clock.instant())).query((row,n)->new Object[]{row.getObject("id",UUID.class),row.getString("candidates")}).list();
        for(var job:jobs) {
            for(var candidate:mapper.readTree((String)job[1])) {
                media.deleteUnreferencedCandidate(UUID.fromString(candidate.path("assetId").asText()));
            }
            jdbc.sql("delete from cover_job where id=?").param(job[0]).update();
        }
    }
}
