package com.satir.library;

import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.ifMatch;
import static com.satir.support.Fixtures.publish;
import static com.satir.support.Fixtures.unpublish;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

import tools.jackson.databind.JsonNode;

/** Slice 6: private collections and bookmarks, isolation between members, unavailable records. */
class LibraryIntegrationTest extends IntegrationTest {

    private ApiClient owner;
    private Response first;
    private Response second;

    @BeforeEach
    void content() {
        createOwner();
        owner = ownerClient();
        first = publish(owner, article("Birinci yazı", "birinci", "Bir. İki."));
        second = publish(owner, article("Ağaçlar ve şehir", "agaclar", "Üç."));
    }

    private ApiClient member(String email) {
        createMember(email, "uye-parolasi-123", true);
        ApiClient api = client();
        api.login(email, "uye-parolasi-123");
        api.refreshCsrf();
        return api;
    }

    private Response save(ApiClient api, Response article, Object body) {
        return api.put("/api/v1/me/bookmarks/" + article.id(), body, Map.of());
    }

    private JsonNode collections(ApiClient api) {
        return api.get("/api/v1/me/collections").json().get("items");
    }

    @Test
    void firstSaveLandsInImmutableDefaultCollection() {
        ApiClient reader = member("okur@example.test");
        JsonNode initial = collections(reader);
        assertThat(initial).hasSize(1);
        assertThat(initial.get(0).get("name").asString()).isEqualTo("Genel");
        assertThat(initial.get(0).get("isDefault").asBoolean()).isTrue();

        Response saved = save(reader, first, null);
        assertThat(saved.status()).isEqualTo(200);
        assertThat(saved.text("collectionId")).isEqualTo(initial.get(0).get("id").asString());
        Response again = save(reader, first, Map.of());
        assertThat(again.text("savedAt")).as("target state: retry keeps the record").isEqualTo(saved.text("savedAt"));
        assertThat(collections(reader).get(0).get("count").asLong()).isEqualTo(1);
        assertThat(client().get("/api/v1/articles/" + first.id() + "/stats").json().get("saves").asLong()).isEqualTo(1);

        String defaultId = initial.get(0).get("id").asString();
        Response rename = reader.patch("/api/v1/me/collections/" + defaultId, Map.of("name", "Başka"),
                Map.of("If-Match", ifMatch(initial.get(0).get("version").asLong())));
        assertThat(rename.code()).isEqualTo("DEFAULT_COLLECTION");
        assertThat(reader.delete("/api/v1/me/collections/" + defaultId, null, Map.of("If-Match", "\"0\"")).code())
                .isEqualTo("DEFAULT_COLLECTION");
    }

    @Test
    void collectionsAreUniquePerMemberAndDeletionKeepsBookmarksInGenel() {
        ApiClient reader = member("okur@example.test");
        Response created = reader.command("/api/v1/me/collections", Map.of("name", "  Şiir   seçkisi "), null);
        assertThat(created.status()).isEqualTo(201);
        assertThat(created.text("name")).isEqualTo("Şiir seçkisi");
        assertThat(created.header("Location")).endsWith(created.text("id"));
        assertThat(reader.command("/api/v1/me/collections", Map.of("name", "ŞİİR SEÇKİSİ"), null).code())
                .as("Turkish case-insensitive").isEqualTo("DUPLICATE_COLLECTION");
        assertThat(reader.command("/api/v1/me/collections", Map.of("name", "genel"), null).code()).isEqualTo("DUPLICATE_COLLECTION");
        assertThat(reader.post("/api/v1/me/collections", Map.of("name", "Anahtarsız"), Map.of()).status())
                .as("POST create needs Idempotency-Key").isEqualTo(428);

        Response saved = save(reader, first, Map.of("collectionId", created.text("id")));
        String savedAt = saved.text("savedAt");
        clock.advance(java.time.Duration.ofMinutes(5));
        save(reader, second, null);

        Response stale = reader.delete("/api/v1/me/collections/" + created.text("id"), null, Map.of("If-Match", "\"9\""));
        assertThat(stale.status()).isEqualTo(412);
        Response deleted = reader.delete("/api/v1/me/collections/" + created.text("id"), null,
                Map.of("If-Match", created.etag()));
        assertThat(deleted.status()).isEqualTo(204);

        JsonNode items = reader.get("/api/v1/me/bookmarks").json().get("items");
        assertThat(items).hasSize(2);
        assertThat(items.get(0).get("articleId").asString()).as("saved order preserved").isEqualTo(first.text("id"));
        assertThat(items.get(0).get("savedAt").asString()).as("moving never changes savedAt").isEqualTo(savedAt);
        assertThat(items.get(0).get("collectionId").asString()).isEqualTo(collections(reader).get(0).get("id").asString());
    }

    @Test
    void membersNeverSeeEachOthersLibrary() {
        ApiClient alice = member("alice@example.test");
        ApiClient bob = member("bob@example.test");
        Response aliceCollection = alice.command("/api/v1/me/collections", Map.of("name", "Özel"), null);
        save(alice, first, Map.of("collectionId", aliceCollection.text("id")));

        assertThat(bob.get("/api/v1/me/bookmarks").json().get("totalElements").asLong()).isZero();
        assertThat(bob.get("/api/v1/me/bookmarks?collectionId=" + aliceCollection.text("id")).status()).isEqualTo(404);
        assertThat(save(bob, first, Map.of("collectionId", aliceCollection.text("id"))).status())
                .as("foreign collection is not found").isEqualTo(404);
        assertThat(bob.patch("/api/v1/me/collections/" + aliceCollection.text("id"), Map.of("name", "Ele geçir"),
                Map.of("If-Match", aliceCollection.etag())).status()).isEqualTo(404);
        assertThat(bob.delete("/api/v1/me/collections/" + aliceCollection.text("id"), null,
                Map.of("If-Match", aliceCollection.etag())).status()).isEqualTo(404);
        assertThat(alice.get("/api/v1/me/bookmarks").json().get("totalElements").asLong()).isEqualTo(1);
        assertThat(owner.get("/api/v1/studio/members").json().get("items").get(0).has("bookmarks"))
                .as("owner member list carries no library data").isFalse();
    }

    @Test
    void hiddenArticlesStaySavedButRevealNothing() {
        ApiClient reader = member("okur@example.test");
        save(reader, first, null);
        clock.advance(java.time.Duration.ofMinutes(1));
        save(reader, second, null);
        unpublish(owner, first);

        JsonNode items = reader.get("/api/v1/me/bookmarks").json().get("items");
        assertThat(items).hasSize(2);
        JsonNode hidden = items.get(0);
        assertThat(hidden.get("available").asBoolean()).isFalse();
        assertThat(hidden.has("article")).as("no title, abstract or cover of hidden writing").isFalse();
        assertThat(items.get(1).get("article").get("title").asString()).isEqualTo("Ağaçlar ve şehir");
        assertThat(reader.get("/api/v1/me/bookmarks?q=birinci").json().get("totalElements").asLong())
                .as("hidden records never match a search").isZero();

        Response state = reader.get("/api/v1/me/article-state?ids=" + first.id() + "," + second.id());
        assertThat(state.json().get("items").get(0).get("available").asBoolean()).isFalse();
        assertThat(state.json().get("items").get(0).has("bookmark")).isFalse();
        assertThat(state.json().get("items").get(1).get("bookmark").get("articleId").asString()).isEqualTo(second.text("id"));

        ApiClient other = member("baska@example.test");
        assertThat(save(other, first, null).status()).as("a hidden article cannot be newly saved").isEqualTo(404);
        assertThat(reader.delete("/api/v1/me/bookmarks/" + first.id(), null, Map.of()).status()).isEqualTo(204);
        assertThat(reader.get("/api/v1/me/bookmarks").json().get("totalElements").asLong()).isEqualTo(1);
    }

    @Test
    void searchAndSortUseVisibleMetadata() {
        ApiClient reader = member("okur@example.test");
        save(reader, first, null);
        clock.advance(java.time.Duration.ofMinutes(1));
        save(reader, second, null);
        assertThat(reader.get("/api/v1/me/bookmarks?q=AĞAÇ").json().get("items").get(0).get("articleId").asString())
                .isEqualTo(second.text("id"));
        JsonNode byTitle = reader.get("/api/v1/me/bookmarks?sort=title_asc").json().get("items");
        assertThat(byTitle.get(0).get("article").get("title").asString()).as("Turkish collation").isEqualTo("Ağaçlar ve şehir");
        JsonNode newest = reader.get("/api/v1/me/bookmarks?sort=saved_desc").json().get("items");
        assertThat(newest.get(0).get("articleId").asString()).isEqualTo(second.text("id"));
        assertThat(reader.get("/api/v1/me/bookmarks?sort=random").code()).isEqualTo("INVALID_SORT");
    }

    @Test
    void concurrentSavesCreateOneBookmark() throws Exception {
        ApiClient reader = member("okur@example.test");
        reader.get("/api/v1/me/collections");
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            Callable<Integer> task = () -> save(reader, first, null).status();
            var futures = new java.util.ArrayList<Future<Integer>>();
            for (int i = 0; i < 6; i++) {
                futures.add(pool.submit(task));
            }
            for (Future<Integer> future : futures) {
                assertThat(future.get()).isEqualTo(200);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(jdbc.sql("SELECT count(*) FROM bookmark").query(Long.class).single()).isEqualTo(1);
    }

    @Test
    void unverifiedAccountsAndVisitorsHaveNoLibrary() {
        createMember("bekleyen@example.test", "uye-parolasi-123", false);
        ApiClient pending = client();
        pending.login("bekleyen@example.test", "uye-parolasi-123");
        pending.refreshCsrf();
        assertThat(pending.get("/api/v1/me/collections").code()).isEqualTo("EMAIL_VERIFICATION_REQUIRED");
        ApiClient visitor = client();
        visitor.refreshCsrf();
        assertThat(visitor.put("/api/v1/me/bookmarks/" + UUID.randomUUID(), null, Map.of()).status()).isEqualTo(401);
    }

    @Test
    void accountDeletionRemovesLibraryAndSaveTotals() {
        ApiClient reader = member("okur@example.test");
        save(reader, first, null);
        assertThat(reader.post("/api/v1/auth/reauthenticate", Map.of("password", "uye-parolasi-123")).status()).isEqualTo(200);
        assertThat(reader.delete("/api/v1/me", Map.of("confirmation", "DELETE"), Map.of()).status()).isEqualTo(204);
        assertThat(jdbc.sql("SELECT count(*) FROM bookmark").query(Long.class).single()).isZero();
        assertThat(jdbc.sql("SELECT count(*) FROM collection").query(Long.class).single()).isZero();
        assertThat(client().get("/api/v1/articles/" + first.id() + "/stats").json().get("saves").asLong()).isZero();
    }
}
