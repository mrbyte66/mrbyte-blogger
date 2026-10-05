package com.satir.editorial;

import static com.satir.support.Fixtures.article;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.satir.delivery.application.OutboxWorker;
import com.satir.editorial.application.PublicationScheduler;
import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

/** Server-side scheduling + transactional outbox + publication e-mail (slice 4). */
class PublicationSchedulingIntegrationTest extends IntegrationTest {

    @Autowired
    PublicationScheduler scheduler;

    @Autowired
    OutboxWorker worker;

    private ApiClient owner;

    private Response schedule(Response edit, Instant at) {
        return owner.command("/api/v1/studio/articles/" + edit.id() + "/actions",
                Map.of("action", "schedule", "scheduledAt", at.toString(), "timeZone", "Europe/Istanbul"), edit.etag());
    }

    private Response draft(String slug) {
        return owner.command("/api/v1/studio/articles", article("Planlı " + slug, slug, "Metin."), null);
    }

    @Test
    void scheduledArticlePublishesOnceWhenDueAndMailsTheOwner() {
        createOwner();
        owner = ownerClient();
        Instant at = clock.instant().plus(Duration.ofHours(2));
        Response scheduled = schedule(draft("planli"), at);
        assertThat(scheduled.status()).as(String.valueOf(scheduled.json())).isEqualTo(200);
        assertThat(scheduled.text("status")).isEqualTo("scheduled");
        assertThat(scheduled.text("scheduleZone")).isEqualTo("Europe/Istanbul");

        ApiClient visitor = client();
        assertThat(scheduler.runOnce()).isZero();
        assertThat(visitor.get("/api/v1/articles/by-slug/planli").status()).isEqualTo(404);

        clock.advance(Duration.ofHours(2).plusSeconds(1));
        assertThat(scheduler.runOnce()).isEqualTo(1);
        assertThat(scheduler.runOnce()).as("a second tick does not publish again").isZero();
        assertThat(visitor.get("/api/v1/articles/by-slug/planli").status()).isEqualTo(200);

        assertThat(worker.runOnce(10)).isEqualTo(1);
        assertThat(mail.to(OWNER_EMAIL)).hasSize(1);
        assertThat(mail.to(OWNER_EMAIL).getFirst().getText()).contains("https://satir.test/yazilar/planli");
        assertThat(worker.runOnce(10)).as("job done; nothing to resend").isZero();
        assertThat(owner.get("/api/v1/studio/publication-jobs").json().get("items").get(0).get("state").asString()).isEqualTo("done");
    }

    @Test
    void cancellingBeforeTheDueTimeWins() {
        createOwner();
        owner = ownerClient();
        Response scheduled = schedule(draft("iptal"), clock.instant().plus(Duration.ofMinutes(5)));
        Response cancelled = owner.command("/api/v1/studio/articles/" + scheduled.id() + "/actions",
                Map.of("action", "cancel-schedule"), scheduled.etag());
        assertThat(cancelled.text("status")).isEqualTo("draft");
        assertThat(cancelled.text("scheduledAt")).isNull();

        clock.advance(Duration.ofMinutes(10));
        assertThat(scheduler.runOnce()).isZero();
        assertThat(client().get("/api/v1/articles/by-slug/iptal").status()).isEqualTo(404);
        assertThat(jdbc.sql("SELECT count(*) FROM outbox_job").query(Long.class).single()).isZero();
    }

    @Test
    void schedulingRejectsPastTimesAndInvalidZones() {
        createOwner();
        owner = ownerClient();
        Response draft = draft("gecmis");
        Response past = schedule(draft, clock.instant().minusSeconds(60));
        assertThat(past.status()).isEqualTo(422);
        assertThat(past.json().get("errors").get(0).get("code").asString()).isEqualTo("IN_PAST");

        Response badZone = owner.command("/api/v1/studio/articles/" + draft.id() + "/actions",
                Map.of("action", "schedule", "scheduledAt", clock.instant().plusSeconds(3600).toString(), "timeZone", "Mars/Olympus"),
                draft.etag());
        assertThat(badZone.json().get("errors").get(0).get("field").asString()).isEqualTo("timeZone");
    }

    @Test
    void savingAScheduledArticleAfterItsTimeIsRefused() {
        createOwner();
        owner = ownerClient();
        Response scheduled = schedule(draft("vakti-gecti"), clock.instant().plus(Duration.ofMinutes(1)));
        clock.advance(Duration.ofMinutes(2));
        Response save = owner.put("/api/v1/studio/articles/" + scheduled.id(), article("Yeni", "vakti-gecti", "x"),
                Map.of("If-Match", scheduled.etag()));
        assertThat(save.status()).isEqualTo(409);
        assertThat(save.code()).isEqualTo("SCHEDULE_ALREADY_DUE");
    }

    @Test
    void disabledPreferenceSkipsTheMailAndReenablingDoesNotResend() {
        createOwner();
        owner = ownerClient();
        Response me = owner.get("/api/v1/me");
        owner.patch("/api/v1/me/preferences", Map.of("publicationEmail", false), Map.of("If-Match", me.etag()));

        Response draft = draft("sessiz");
        owner.command("/api/v1/studio/articles/" + draft.id() + "/actions", Map.of("action", "publish"), draft.etag());
        worker.runOnce(10);
        assertThat(mail.sent()).isEmpty();

        Response again = owner.get("/api/v1/me");
        owner.patch("/api/v1/me/preferences", Map.of("publicationEmail", true), Map.of("If-Match", again.etag()));
        worker.runOnce(10);
        assertThat(mail.sent()).as("old events are not replayed").isEmpty();
        assertThat(owner.get("/api/v1/studio/publication-jobs").json().get("items").get(0).get("state").asString()).isEqualTo("skipped");
    }

    @Test
    void providerOutageIsRetriedWithBackoffAndNeverUndoesPublication() {
        createOwner();
        owner = ownerClient();
        mail.failing(true);
        Response draft = draft("kesinti");
        owner.command("/api/v1/studio/articles/" + draft.id() + "/actions", Map.of("action", "publish"), draft.etag());

        worker.runOnce(10);
        Response jobs = owner.get("/api/v1/studio/publication-jobs");
        assertThat(jobs.json().get("items").get(0).get("state").asString()).isEqualTo("pending");
        assertThat(jobs.json().get("items").get(0).get("lastErrorCode").asString()).isEqualTo("MAIL_SEND_FAILED");
        assertThat(client().get("/api/v1/articles/by-slug/kesinti").status()).isEqualTo(200);

        assertThat(worker.runOnce(10)).as("not before the backoff").isZero();
        mail.failing(false);
        clock.advance(Duration.ofMinutes(2));
        assertThat(worker.runOnce(10)).isEqualTo(1);
        assertThat(mail.to(OWNER_EMAIL)).hasSize(1);
    }

    @Test
    void republishingCreatesANewEventButLiveEditsDoNot() {
        createOwner();
        owner = ownerClient();
        Response draft = draft("tekrar");
        Response live = owner.command("/api/v1/studio/articles/" + draft.id() + "/actions", Map.of("action", "publish"), draft.etag());
        Response edited = owner.put("/api/v1/studio/articles/" + live.id(), article("Düzeltildi", "tekrar", "Yeni metin."),
                Map.of("If-Match", live.etag()));
        assertThat(jdbc.sql("SELECT count(*) FROM outbox_job").query(Long.class).single()).isEqualTo(1);

        Response unpublished = owner.command("/api/v1/studio/articles/" + edited.id() + "/actions", Map.of("action", "save-draft"), edited.etag());
        owner.command("/api/v1/studio/articles/" + unpublished.id() + "/actions", Map.of("action", "publish"), unpublished.etag());
        assertThat(jdbc.sql("SELECT count(*) FROM outbox_job").query(Long.class).single()).isEqualTo(2);
        assertThat(client().get("/api/v1/articles/by-slug/tekrar").text("title")).isEqualTo("Düzeltildi");
    }
}
