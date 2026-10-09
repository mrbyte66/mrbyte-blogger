package com.satir.editorial;

import static com.satir.support.Fixtures.action;
import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.ifMatch;
import static com.satir.support.Fixtures.series;
import static com.satir.support.Fixtures.version;
import static com.satir.support.Fixtures.with;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.Fixtures;
import com.satir.support.IntegrationTest;

class EditorialIntegrationTest extends IntegrationTest {

    private ApiClient owner;

    private Response create(Map<String, Object> body) {
        Response created = owner.command("/api/v1/studio/articles", body, null);
        assertThat(created.status()).as(String.valueOf(created.json())).isEqualTo(201);
        return created;
    }

    private Response act(Response edit, String name) {
        return owner.command("/api/v1/studio/articles/" + edit.id() + "/actions", action(name), edit.etag());
    }

    private Response publish(Map<String, Object> body) {
        Response published = act(create(body), "publish");
        assertThat(published.status()).as(String.valueOf(published.json())).isEqualTo(200);
        return published;
    }

    @Test
    void draftsAreInvisibleUntilPublished() {
        createOwner();
        owner = ownerClient();
        Response draft = create(article("İlk yazı", "ilk-yazi", "Merhaba dünya."));
        assertThat(draft.text("status")).isEqualTo("draft");
        assertThat(draft.etag()).isEqualTo("\"0\"");

        ApiClient visitor = client();
        assertThat(visitor.get("/api/v1/articles/by-slug/ilk-yazi").status()).isEqualTo(404);
        assertThat(visitor.get("/api/v1/articles").json().get("totalElements").asLong()).isZero();

        Response published = act(draft, "publish");
        assertThat(published.text("status")).isEqualTo("published");
        assertThat(published.text("firstPublishedAt")).isNotNull();

        Response detail = visitor.get("/api/v1/articles/by-slug/ilk-yazi");
        assertThat(detail.status()).isEqualTo(200);
        assertThat(detail.text("title")).isEqualTo("İlk yazı");
        assertThat(detail.json().get("document").get("blocks").get(0).get("text").asString()).isEqualTo("Merhaba dünya.");
        assertThat(detail.json().has("status")).as("no private fields in public DTO").isFalse();
        assertThat(detail.json().get("categories").get(0).get("name").asString()).isEqualTo("Yazılım");
        assertThat(visitor.get("/api/v1/articles?expand=document").json().get("items").get(0).has("document")).isTrue();
        assertThat(visitor.get("/api/v1/categories").json().get("items")).hasSize(1);
        assertThat(detail.header("Cache-Control")).contains("no-store");
    }

    @Test
    void publishingRequiresCompleteContent() {
        createOwner();
        owner = ownerClient();
        Response noCategory = create(with(article("Konusuz", "konusuz", "Metin."), "categoryIds", List.of()));
        Response rejected = act(noCategory, "publish");
        assertThat(rejected.status()).isEqualTo(422);
        assertThat(rejected.json().get("errors").get(0).get("field").asString()).isEqualTo("categoryIds");

        Response empty = create(article("Boş", "bos", "   "));
        assertThat(act(empty, "publish").json().get("errors").get(0).get("code").asString()).isEqualTo("PARAGRAPH_REQUIRED");
    }

    @Test
    void privateWritingNeverReachesPublicSurfaces() {
        createOwner();
        owner = ownerClient();
        Response privateDraft = owner.command("/api/v1/studio/articles",
                with(article("Gizli günlük", "gizli-gunluk", "Kimse görmesin."), "visibility", "private"), null);
        assertThat(privateDraft.text("visibility")).isEqualTo("private");
        Response blocked = act(privateDraft, "publish");
        assertThat(blocked.status()).isEqualTo(409);
        assertThat(blocked.code()).isEqualTo("PRIVATE_NOT_PUBLISHABLE");

        Response live = publish(article("Açık yazı", "acik-yazi", "Herkese açık."));
        Response madePrivate = act(live, "make-private");
        assertThat(madePrivate.text("status")).isEqualTo("draft");
        assertThat(madePrivate.text("visibility")).isEqualTo("private");

        ApiClient visitor = client();
        for (String slug : List.of("gizli-gunluk", "acik-yazi")) {
            assertThat(visitor.get("/api/v1/articles/by-slug/" + slug).status()).isEqualTo(404);
        }
        assertThat(visitor.get("/api/v1/articles?q=gizli").json().get("totalElements").asLong()).isZero();
        assertThat(visitor.get("/api/v1/seo/urls").json().get("items")).isEmpty();

        // Owner sees it only through Studio; the public endpoint stays 404 even for the owner.
        assertThat(owner.get("/api/v1/articles/by-slug/acik-yazi").status()).isEqualTo(404);
        Response prepared = act(madePrivate, "prepare-public");
        assertThat(prepared.text("visibility")).isEqualTo("public");
        assertThat(prepared.text("status")).isEqualTo("draft");
    }

    @Test
    void writesRequireTheCurrentVersion() {
        createOwner();
        owner = ownerClient();
        Response draft = create(article("Sürümlü", "surumlu", "Bir."));
        String path = "/api/v1/studio/articles/" + draft.id();

        assertThat(owner.put(path, article("Sürümlü", "surumlu", "İki."), Map.of()).status()).isEqualTo(428);
        Response saved = owner.put(path, article("Sürümlü", "surumlu", "İki."), Map.of("If-Match", draft.etag()));
        assertThat(saved.status()).isEqualTo(200);
        assertThat(saved.version()).isEqualTo(draft.version() + 1);

        Response stale = owner.put(path, article("Sürümlü", "surumlu", "Üç."), Map.of("If-Match", draft.etag()));
        assertThat(stale.status()).isEqualTo(412);
        assertThat(stale.code()).isEqualTo("STALE_VERSION");
    }

    @Test
    void idempotencyKeyReplaysAndRejectsReuse() {
        createOwner();
        owner = ownerClient();
        String key = UUID.randomUUID().toString();
        Map<String, Object> body = article("Bir kez", "bir-kez", "Tek.");

        Response first = owner.post("/api/v1/studio/articles", body, Map.of("Idempotency-Key", key));
        Response retry = owner.post("/api/v1/studio/articles", body, Map.of("Idempotency-Key", key));
        assertThat(retry.status()).isEqualTo(201);
        assertThat(retry.text("id")).isEqualTo(first.text("id"));
        assertThat(retry.header("Idempotent-Replayed")).isEqualTo("true");
        assertThat(jdbc.sql("SELECT count(*) FROM article").query(Long.class).single()).isEqualTo(1);

        Response reused = owner.post("/api/v1/studio/articles", article("Başka", "baska", "Tek."), Map.of("Idempotency-Key", key));
        assertThat(reused.status()).isEqualTo(409);
        assertThat(reused.code()).isEqualTo("IDEMPOTENCY_KEY_REUSED");
        assertThat(owner.post("/api/v1/studio/articles", body, Map.of()).status()).isEqualTo(428);
    }

    @Test
    void slugChangesKeepOldUrlsAsRedirectsOfTheSameArticle() {
        createOwner();
        owner = ownerClient();
        Response live = publish(article("Eski ad", "eski-ad", "Metin."));
        Response renamed = owner.put("/api/v1/studio/articles/" + live.id(), article("Yeni ad", "yeni-ad", "Metin."),
                Map.of("If-Match", live.etag()));
        assertThat(renamed.status()).isEqualTo(200);

        ApiClient visitor = client();
        Response old = visitor.get("/api/v1/articles/by-slug/eski-ad");
        assertThat(old.text("resolution")).isEqualTo("redirect");
        assertThat(old.text("canonicalPath")).isEqualTo("/yazilar/yeni-ad");

        Response taken = owner.command("/api/v1/studio/articles", article("Çakışan", "eski-ad", "x"), null);
        assertThat(taken.status()).isEqualTo(409);
        assertThat(taken.code()).isEqualTo("SLUG_TAKEN");
        assertThat(taken.text("suggestedSlug")).isEqualTo("eski-ad-2");

        act(renamed, "archive");
        assertThat(visitor.get("/api/v1/articles/by-slug/eski-ad").status()).as("hidden alias leaks nothing").isEqualTo(404);
    }

    @Test
    void seriesShowOnlyPublicChaptersInOrder() {
        createOwner();
        owner = ownerClient();
        Response first = publish(article("Birinci", "birinci", "1."));
        Response second = create(article("İkinci", "ikinci", "2."));
        Response third = publish(article("Üçüncü", "ucuncu", "3."));

        Response created = owner.command("/api/v1/studio/series", series("Yolculuk", "yolculuk",
                List.of(first.text("id"), second.text("id"), third.text("id")),
                List.of(version(first), version(second), version(third))), null);
        assertThat(created.status()).as(String.valueOf(created.json())).isEqualTo(201);
        assertThat(client().get("/api/v1/series/by-slug/yolculuk").status()).as("draft series hidden").isEqualTo(404);

        Response published = owner.command("/api/v1/studio/series/" + created.id() + "/actions", action("publish"), created.etag());
        assertThat(published.status()).isEqualTo(200);

        ApiClient visitor = client();
        Response detail = visitor.get("/api/v1/series/by-slug/yolculuk");
        assertThat(detail.json().get("chapterCount").asInt()).isEqualTo(2);
        assertThat(detail.json().get("chapters").get(1).get("slug").asString()).isEqualTo("ucuncu");

        Response chapter = visitor.get("/api/v1/articles/by-slug/ucuncu");
        assertThat(chapter.json().get("series").get("position").asInt()).isEqualTo(2);
        assertThat(chapter.json().get("series").get("previous").get("slug").asString()).isEqualTo("birinci");
        assertThat(chapter.json().get("series").get("next").isNull()).isTrue();

        Response chapters = visitor.get("/api/v1/series/" + created.id() + "/chapters");
        assertThat(chapters.json().get("items").get(1).get("chapterNumber").asInt()).isEqualTo(2);

        // An article belongs to at most one series.
        Response latestFirst = owner.get("/api/v1/studio/articles/" + first.id());
        Response other = owner.command("/api/v1/studio/series", series("Başka", "baska-seri",
                List.of(first.text("id")), List.of(version(latestFirst))), null);
        assertThat(other.status()).isEqualTo(409);
        assertThat(other.code()).isEqualTo("ARTICLE_IN_OTHER_SERIES");
    }

    @Test
    void emptySeriesCannotBePublished() {
        createOwner();
        owner = ownerClient();
        Response draftChapter = create(article("Taslak", "taslak", "x"));
        Response created = owner.command("/api/v1/studio/series",
                series("Bekleyen", "bekleyen", List.of(draftChapter.text("id")), List.of(version(draftChapter))), null);
        Response rejected = owner.command("/api/v1/studio/series/" + created.id() + "/actions", action("publish"), created.etag());
        assertThat(rejected.status()).isEqualTo(409);
        assertThat(rejected.code()).isEqualTo("SERIES_EMPTY");
    }

    @Test
    void articleSaveMovesItIntoASeriesAtomically() {
        createOwner();
        owner = ownerClient();
        Response series = owner.command("/api/v1/studio/series", series("Seri", "seri", List.of(), List.of()), null);
        Response draft = create(article("Bölüm", "bolum", "x"));
        Map<String, Object> body = with(with(article("Bölüm", "bolum", "x"), "seriesPlacement", Map.of("seriesId", series.text("id"))),
                "seriesVersions", List.of(Map.of("id", series.text("id"), "version", 0)));

        Response saved = owner.put("/api/v1/studio/articles/" + draft.id(), body, Map.of("If-Match", draft.etag()));
        assertThat(saved.status()).as(String.valueOf(saved.json())).isEqualTo(200);
        assertThat(saved.json().get("seriesPlacement").get("seriesId").asString()).isEqualTo(series.text("id"));
        Response reloaded = owner.get("/api/v1/studio/series/" + series.id());
        assertThat(reloaded.json().get("chapterIds").get(0).asString()).isEqualTo(draft.text("id"));

        Response withoutSeriesVersion = owner.put("/api/v1/studio/articles/" + draft.id(),
                with(article("Bölüm", "bolum", "x"), "seriesPlacement", null), Map.of("If-Match", ifMatch(saved.version())));
        assertThat(withoutSeriesVersion.status()).isEqualTo(422);
    }

    @Test
    void firstChapterPublicationActivatesDraftSeriesWithFreshVersionAtomically() {
        createOwner();
        owner = ownerClient();
        Response created = owner.command("/api/v1/studio/series", series("Mevsimler", "mevsimler", List.of(), List.of()), null);
        Response chapter = create(with(with(article("İlkbahar", "ilkbahar", "Bahar geldi."),
                "seriesPlacement", Map.of("seriesId", created.text("id"))),
                "seriesVersions", List.of(version(created))));
        Response currentSeries = owner.get("/api/v1/studio/series/" + created.id());
        assertThat(currentSeries.version()).isGreaterThan(created.version());

        Response stale = owner.command("/api/v1/studio/articles/" + chapter.id() + "/actions",
                Map.of("action", "publish", "publishSeries", true, "seriesVersion", created.version()), chapter.etag());
        assertThat(stale.status()).isEqualTo(412);
        assertThat(owner.get("/api/v1/studio/articles/" + chapter.id()).text("status")).isEqualTo("draft");
        assertThat(client().get("/api/v1/series/by-slug/mevsimler").status()).isEqualTo(404);

        Response published = owner.command("/api/v1/studio/articles/" + chapter.id() + "/actions",
                Map.of("action", "publish", "publishSeries", true, "seriesVersion", currentSeries.version()), chapter.etag());
        assertThat(published.status()).as(String.valueOf(published.json())).isEqualTo(200);
        assertThat(owner.get("/api/v1/studio/series/" + created.id()).text("status")).isEqualTo("published");
        assertThat(client().get("/api/v1/series/by-slug/mevsimler").json().get("chapterCount").asInt()).isEqualTo(1);

        Response latestSeries = owner.get("/api/v1/studio/series/" + created.id());
        Response second = create(with(with(article("Yaz", "yaz", "Yaz geldi."),
                "seriesPlacement", Map.of("seriesId", created.text("id"))),
                "seriesVersions", List.of(version(latestSeries))));
        assertThat(act(second, "publish").status()).isEqualTo(200);
        assertThat(client().get("/api/v1/series/by-slug/mevsimler").json().get("chapterCount").asInt()).isEqualTo(2);
    }

    @Test
    void membersAndVisitorsCannotUseStudio() {
        createOwner();
        createMember("okur@example.test", "okur-parolasi-123", true);
        ApiClient member = client();
        member.login("okur@example.test", "okur-parolasi-123");
        member.refreshCsrf();

        assertThat(member.get("/api/v1/studio/articles").status()).isEqualTo(403);
        assertThat(member.command("/api/v1/studio/articles", article("x", "x", "x"), null).status()).isEqualTo(403);
        ApiClient anonymous = client();
        anonymous.refreshCsrf();
        assertThat(anonymous.command("/api/v1/studio/articles", article("x", "x", "x"), null).status()).isEqualTo(401);
        assertThat(jdbc.sql("SELECT count(*) FROM article").query(Long.class).single()).isZero();
    }

    @Test
    void studioListsEverythingWithFilters() {
        createOwner();
        owner = ownerClient();
        publish(article("Yayında", "yayinda", "x"));
        create(article("Taslak", "taslak", "x"));
        Response list = owner.get("/api/v1/studio/articles?size=50");
        assertThat(list.json().get("totalElements").asLong()).isEqualTo(2);
        assertThat(owner.get("/api/v1/studio/articles?status=draft").json().get("items").get(0).get("slug").asString())
                .isEqualTo("taslak");
        assertThat(owner.get("/api/v1/studio/articles?status=bogus").status()).isEqualTo(422);
        assertThat(owner.get("/api/v1/studio/categories").json().get("items")).hasSize(3);
        assertThat(owner.get("/api/v1/articles?size=51").status()).isEqualTo(422);
    }

    @Test
    void unknownBlockTypesAreRejected() {
        createOwner();
        owner = ownerClient();
        Map<String, Object> body = with(article("x", "x", "x"), "document",
                Map.of("schemaVersion", 1, "blocks", List.of(Map.of("id", UUID.randomUUID().toString(), "type", "script", "text", "alert(1)"))));
        Response response = owner.command("/api/v1/studio/articles", body, null);
        assertThat(response.status()).isEqualTo(422);
        assertThat(Fixtures.SOFTWARE).isNotBlank();
    }
}
