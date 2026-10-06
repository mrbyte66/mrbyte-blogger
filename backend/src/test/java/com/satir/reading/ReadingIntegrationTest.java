package com.satir.reading;

import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.publish;
import static com.satir.support.Fixtures.unpublish;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.Fixtures;
import com.satir.support.IntegrationTest;

import tools.jackson.databind.JsonNode;

/** Slice 6: private annotations anchored to stable block IDs, guest import, and visit history. */
class ReadingIntegrationTest extends IntegrationTest {

    private static final String TEXT = "Satırlar arasında saklı bir cümle.";

    private ApiClient owner;
    private Response published;
    private String blockId;
    private String revisionId;

    @BeforeEach
    void content() {
        createOwner();
        owner = ownerClient();
        published = publish(owner, article("Notlu yazı", "notlu-yazi", TEXT));
        Response detail = client().get("/api/v1/articles/by-slug/notlu-yazi");
        blockId = detail.json().get("document").get("blocks").get(0).get("id").asString();
        revisionId = detail.text("revisionId");
    }

    private ApiClient member(String email) {
        createMember(email, "uye-parolasi-123", true);
        ApiClient api = client();
        api.login(email, "uye-parolasi-123");
        api.refreshCsrf();
        return api;
    }

    private Map<String, Object> mark(String kind, int start, int end, String note) {
        return Map.of("kind", kind, "revisionId", revisionId, "note", note, "fragments", List.of(Map.of(
                "blockId", blockId, "start", start, "end", end, "quote", TEXT.substring(start, end),
                "before", TEXT.substring(Math.max(0, start - 10), start), "after", "")));
    }

    private String path(UUID markId) {
        return "/api/v1/me/articles/" + published.id() + "/annotations/" + markId;
    }

    @Test
    void createUpdateAndDeleteOwnMarkWithPreconditions() {
        ApiClient reader = member("okur@example.test");
        UUID markId = UUID.randomUUID();
        assertThat(reader.put(path(markId), mark("highlight", 0, 8, ""), Map.of()).status())
                .as("create needs If-None-Match, update needs If-Match").isEqualTo(428);

        Response created = reader.put(path(markId), mark("highlight", 0, 8, ""), Map.of("If-None-Match", "*"));
        assertThat(created.status()).as(String.valueOf(created.json())).isEqualTo(201);
        assertThat(created.text("kind")).isEqualTo("highlight");
        assertThat(created.etag()).isEqualTo("\"0\"");
        assertThat(reader.put(path(markId), mark("highlight", 0, 8, ""), Map.of("If-None-Match", "*")).status()).isEqualTo(412);

        Response updated = reader.put(path(markId), mark("note", 0, 8, "Güzel giriş"), Map.of("If-Match", created.etag()));
        assertThat(updated.status()).isEqualTo(200);
        assertThat(updated.text("note")).isEqualTo("Güzel giriş");
        assertThat(reader.put(path(markId), mark("underline", 0, 8, ""), Map.of("If-Match", created.etag())).status())
                .as("stale version").isEqualTo(412);

        JsonNode list = reader.get("/api/v1/me/articles/" + published.id() + "/annotations").json();
        assertThat(list.get("revisionId").asString()).isEqualTo(revisionId);
        assertThat(list.get("items")).hasSize(1);
        assertThat(list.get("items").get(0).get("fragments").get(0).get("quote").asString()).isEqualTo("Satırlar");

        assertThat(reader.delete(path(markId), null, Map.of()).status()).isEqualTo(204);
        assertThat(reader.delete(path(markId), null, Map.of()).status()).isEqualTo(404);
    }

    @Test
    void quotesMustMatchTheAnchoredRevision() {
        ApiClient reader = member("okur@example.test");
        Map<String, Object> wrongQuote = Map.of("kind", "highlight", "revisionId", revisionId, "note", "", "fragments",
                List.of(Map.of("blockId", blockId, "start", 0, "end", 5, "quote", "Uydur", "before", "", "after", "")));
        Response rejected = reader.put(path(UUID.randomUUID()), wrongQuote, Map.of("If-None-Match", "*"));
        assertThat(rejected.status()).isEqualTo(422);
        assertThat(rejected.json().get("errors").get(0).get("code").asString()).isEqualTo("QUOTE_MISMATCH");

        Map<String, Object> unknownBlock = Map.of("kind", "highlight", "revisionId", revisionId, "note", "", "fragments",
                List.of(Map.of("blockId", UUID.randomUUID().toString(), "start", 0, "end", 1, "quote", "S", "before", "", "after", "")));
        assertThat(reader.put(path(UUID.randomUUID()), unknownBlock, Map.of("If-None-Match", "*"))
                .json().get("errors").get(0).get("code").asString()).isEqualTo("UNKNOWN_ANCHOR");

        Map<String, Object> abstractMark = Map.of("kind", "underline", "revisionId", revisionId, "note", "", "fragments",
                List.of(Map.of("blockId", "abstract", "start", 0, "end", 4, "quote", "Kısa", "before", "", "after", "")));
        assertThat(reader.put(path(UUID.randomUUID()), abstractMark, Map.of("If-None-Match", "*")).status()).isEqualTo(201);

        Map<String, Object> foreignRevision = Map.of("kind", "highlight", "revisionId", UUID.randomUUID().toString(),
                "note", "", "fragments", List.of(Map.of("blockId", blockId, "start", 0, "end", 1, "quote", "S", "before", "", "after", "")));
        assertThat(reader.put(path(UUID.randomUUID()), foreignRevision, Map.of("If-None-Match", "*"))
                .json().get("errors").get(0).get("code").asString()).isEqualTo("UNKNOWN_REVISION");
        Map<String, Object> blankNote = Map.of("kind", "note", "revisionId", revisionId, "note", "  ", "fragments",
                List.of(Map.of("blockId", blockId, "start", 0, "end", 1, "quote", "S", "before", "", "after", "")));
        assertThat(reader.put(path(UUID.randomUUID()), blankNote, Map.of("If-None-Match", "*")).status()).isEqualTo(422);
    }

    @Test
    void marksArePrivateAndHiddenArticlesReturnOpaqueIds() {
        ApiClient alice = member("alice@example.test");
        ApiClient bob = member("bob@example.test");
        UUID markId = UUID.randomUUID();
        alice.put(path(markId), mark("note", 9, 17, "Özel düşüncem"), Map.of("If-None-Match", "*"));

        assertThat(bob.get("/api/v1/me/articles/" + published.id() + "/annotations").json().get("items")).isEmpty();
        assertThat(bob.delete(path(markId), null, Map.of()).status()).isEqualTo(404);
        assertThat(bob.put(path(markId), mark("highlight", 0, 3, ""), Map.of("If-Match", "\"0\"")).status())
                .as("same ID under another account is not found").isEqualTo(404);

        unpublish(owner, published);
        JsonNode hidden = alice.get("/api/v1/me/articles/" + published.id() + "/annotations").json();
        assertThat(hidden.get("available").asBoolean()).isFalse();
        assertThat(hidden.get("items").get(0).get("id").asString()).isEqualTo(markId.toString());
        assertThat(hidden.toString()).doesNotContain("Özel düşüncem").doesNotContain("arasında");
        assertThat(alice.put(path(UUID.randomUUID()), mark("highlight", 0, 3, ""), Map.of("If-None-Match", "*")).status())
                .isEqualTo(404);
        assertThat(jdbc.sql("SELECT count(*) FROM annotation").query(Long.class).single()).as("kept, not deleted").isEqualTo(1);
    }

    @Test
    void guestImportIsIdempotentAndReportsRejectedItems() {
        ApiClient reader = member("okur@example.test");
        UUID importId = UUID.randomUUID();
        Map<String, Object> good = Map.of("articleId", published.text("id"), "revisionId", revisionId, "kind", "highlight",
                "note", "", "fragments", List.of(Map.of("blockId", blockId, "start", 0, "end", 8, "quote", "Satırlar",
                        "before", "", "after", " arası")), "createdAt", clock.instant().minus(Duration.ofDays(3)).toString());
        Map<String, Object> missing = Map.of("articleId", UUID.randomUUID().toString(), "revisionId", revisionId,
                "kind", "highlight", "note", "", "fragments", List.of());
        Map<String, Object> body = Map.of("clientImportId", importId.toString(), "items", List.of(good, missing));

        Response report = reader.post("/api/v1/me/imports/annotations", body, Map.of());
        assertThat(report.status()).as(String.valueOf(report.json())).isEqualTo(200);
        assertThat(report.json().get("accepted")).hasSize(1);
        assertThat(report.json().get("rejected").get(0).get("code").asString()).isEqualTo("NOT_AVAILABLE");

        Response replay = reader.post("/api/v1/me/imports/annotations", body, Map.of());
        assertThat(replay.json()).isEqualTo(report.json());
        assertThat(jdbc.sql("SELECT count(*) FROM annotation").query(Long.class).single()).isEqualTo(1);
        assertThat(reader.post("/api/v1/me/imports/annotations",
                Map.of("clientImportId", importId.toString(), "items", List.of(good)), Map.of()).code()).isEqualTo("IMPORT_ID_REUSED");
    }

    @Test
    void visitsKeepTheLatestOpeningAndHiddenEntriesAreOpaque() {
        ApiClient reader = member("okur@example.test");
        Response second = publish(owner, article("İkinci", "ikinci", "Metin."));
        String secondRevision = client().get("/api/v1/articles/by-slug/ikinci").text("revisionId");

        assertThat(visit(reader, published.text("id"), revisionId, clock.instant()).status()).isEqualTo(204);
        clock.advance(Duration.ofMinutes(10));
        visit(reader, second.text("id"), secondRevision, clock.instant());
        visit(reader, published.text("id"), revisionId, clock.instant().minus(Duration.ofMinutes(30)));

        JsonNode history = reader.get("/api/v1/me/history").json().get("items");
        assertThat(history.get(0).get("articleId").asString()).as("newest first").isEqualTo(second.text("id"));
        assertThat(history.get(0).get("article").get("title").asString()).isEqualTo("İkinci");
        assertThat(java.time.Instant.parse(history.get(1).get("lastVisitedAt").asString()))
                .as("an older replayed visit never moves time backwards")
                // PostgreSQL stores microseconds (rounded), the test clock has nanoseconds.
                .isCloseTo(clock.instant().minus(Duration.ofMinutes(10)),
                        org.assertj.core.api.Assertions.within(1, java.time.temporal.ChronoUnit.MICROS));

        assertThat(visit(reader, published.text("id"), revisionId, clock.instant().minus(Duration.ofDays(2))).status())
                .isEqualTo(422);
        assertThat(visit(reader, published.text("id"), UUID.randomUUID().toString(), clock.instant()).status()).isEqualTo(422);

        unpublish(owner, second);
        JsonNode afterHide = reader.get("/api/v1/me/history").json().get("items");
        JsonNode hidden = afterHide.get(0).get("available").asBoolean() ? afterHide.get(1) : afterHide.get(0);
        assertThat(hidden.get("available").asBoolean()).isFalse();
        assertThat(hidden.has("article")).isFalse();
        assertThat(visit(reader, second.text("id"), secondRevision, clock.instant()).status()).isEqualTo(404);

        assertThat(member("baska@example.test").get("/api/v1/me/history").json().get("totalElements").asLong()).isZero();
        assertThat(reader.delete("/api/v1/me/history", null, Map.of()).status()).isEqualTo(204);
        assertThat(reader.get("/api/v1/me/history").json().get("totalElements").asLong()).isZero();
    }

    @Test
    void seriesHistoryListsOnlyPublicChapters() {
        ApiClient reader = member("okur@example.test");
        Response second = publish(owner, article("İkinci", "ikinci", "Metin."));
        Response series = owner.command("/api/v1/studio/series", Fixtures.series("Seri", "seri",
                List.of(published.text("id"), second.text("id")),
                List.of(Fixtures.version(owner.get("/api/v1/studio/articles/" + published.id())),
                        Fixtures.version(owner.get("/api/v1/studio/articles/" + second.id())))), null);
        assertThat(series.status()).as(String.valueOf(series.json())).isEqualTo(201);
        assertThat(owner.command("/api/v1/studio/series/" + series.id() + "/actions", Fixtures.action("publish"),
                series.etag()).status()).isEqualTo(200);

        visit(reader, published.text("id"), revisionId, clock.instant());
        JsonNode items = reader.get("/api/v1/me/series/" + series.id() + "/history").json().get("items");
        assertThat(items).hasSize(1);
        assertThat(items.get(0).get("articleId").asString()).isEqualTo(published.text("id"));
        assertThat(items.get(0).has("completed")).isFalse();
        assertThat(reader.get("/api/v1/me/series/" + UUID.randomUUID() + "/history").status()).isEqualTo(404);
    }

    @Test
    void accountDeletionRemovesNotesAndHistory() {
        ApiClient reader = member("okur@example.test");
        reader.put(path(UUID.randomUUID()), mark("highlight", 0, 8, ""), Map.of("If-None-Match", "*"));
        visit(reader, published.text("id"), revisionId, clock.instant());
        reader.post("/api/v1/auth/reauthenticate", Map.of("password", "uye-parolasi-123"));
        assertThat(reader.delete("/api/v1/me", Map.of("confirmation", "DELETE"), Map.of()).status()).isEqualTo(204);
        assertThat(jdbc.sql("SELECT count(*) FROM annotation").query(Long.class).single()).isZero();
        assertThat(jdbc.sql("SELECT count(*) FROM reading_history").query(Long.class).single()).isZero();
    }

    private Response visit(ApiClient api, String articleId, String revision, java.time.Instant at) {
        return api.post("/api/v1/me/visits", Map.of("eventId", UUID.randomUUID().toString(), "articleId", articleId,
                "revisionId", revision, "visitedAt", at.toString()), Map.of());
    }
}
