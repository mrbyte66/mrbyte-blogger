package com.satir.engagement;

import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.publish;
import static com.satir.support.Fixtures.unpublish;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.Fixtures;
import com.satir.support.IntegrationTest;

/** Slice 7: idempotent claps and views, server totals, hidden content and bots. */
class EngagementIntegrationTest extends IntegrationTest {

    private static final Map<String, String> BROWSER = Map.of("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36");

    private ApiClient owner;
    private Response published;

    @BeforeEach
    void content() {
        createOwner();
        owner = ownerClient();
        published = publish(owner, article("Alkışlık", "alkislik", "Metin."));
    }

    private ApiClient visitor() {
        ApiClient api = client();
        api.refreshCsrf();
        return api;
    }

    private Response clap(ApiClient api, boolean clapped) {
        return api.put("/api/v1/articles/" + published.id() + "/clap", Map.of("clapped", clapped), BROWSER);
    }

    private Map<String, Object> impression(UUID eventId, String source, UUID pageViewId) {
        return Map.of("eventId", eventId.toString(), "articleId", published.text("id"), "source", source,
                "pageViewId", pageViewId.toString(), "occurredAt", clock.instant().toString());
    }

    @Test
    void anonymousClapIsATargetState() {
        ApiClient visitor = visitor();
        assertThat(visitor.get("/api/v1/articles/" + published.id() + "/my-clap").json().get("clapped").asBoolean()).isFalse();
        assertThat(visitor.post("/api/v1/engagement/session", null, Map.of()).json().get("ready").asBoolean()).isTrue();

        Response first = clap(visitor, true);
        assertThat(first.status()).isEqualTo(200);
        assertThat(first.json().get("claps").asLong()).isEqualTo(1);
        assertThat(clap(visitor, true).json().get("claps").asLong()).as("retry does not double count").isEqualTo(1);
        assertThat(visitor.get("/api/v1/articles/" + published.id() + "/my-clap").json().get("clapped").asBoolean()).isTrue();

        assertThat(clap(visitor(), true).json().get("claps").asLong()).as("another browser is another actor").isEqualTo(2);
        assertThat(clap(visitor, false).json().get("claps").asLong()).isEqualTo(1);
        assertThat(client().get("/api/v1/articles/by-slug/alkislik").json().get("stats").get("claps").asLong()).isEqualTo(1);
        assertThat(jdbc.sql("SELECT count(*) FROM anonymous_actor WHERE secret_hash IS NOT NULL").query(Long.class).single())
                .isEqualTo(2);
    }

    @Test
    void anonymousCookieCarriesOnlyARandomSecret() {
        ApiClient visitor = visitor();
        Response session = visitor.post("/api/v1/engagement/session", null, Map.of());
        String setCookie = session.header("Set-Cookie");
        assertThat(setCookie).startsWith("satir-actor-dev=").contains("HttpOnly").contains("SameSite=Lax").contains("Max-Age=");
        String value = setCookie.substring("satir-actor-dev=".length(), setCookie.indexOf(';'));
        assertThat(jdbc.sql("SELECT count(*) FROM anonymous_actor WHERE secret_hash = :v").param("v", value)
                .query(Long.class).single()).as("only a hash is stored").isZero();
        assertThat(visitor.put("/api/v1/articles/" + published.id() + "/clap", Map.of("clapped", true), null).status())
                .as("CSRF is required").isEqualTo(403);
    }

    @Test
    void memberClapBelongsToTheAccountAndIsNotMergedFromAnonymous() {
        ApiClient browser = visitor();
        clap(browser, true);
        createMember("okur@example.test", "uye-parolasi-123", true);
        browser.login("okur@example.test", "uye-parolasi-123");
        browser.refreshCsrf();
        assertThat(browser.get("/api/v1/articles/" + published.id() + "/my-clap").json().get("clapped").asBoolean())
                .as("anonymous clap is not merged on sign-in").isFalse();
        assertThat(clap(browser, true).json().get("claps").asLong()).isEqualTo(2);

        browser.post("/api/v1/auth/reauthenticate", Map.of("password", "uye-parolasi-123"));
        assertThat(browser.delete("/api/v1/me", Map.of("confirmation", "DELETE"), Map.of()).status()).isEqualTo(204);
        assertThat(client().get("/api/v1/articles/" + published.id() + "/stats").json().get("claps").asLong())
                .as("member claps leave with the account").isEqualTo(1);
    }

    @Test
    void viewsCountOncePerPageViewAndRetriesAreHarmless() {
        ApiClient visitor = visitor();
        visitor.post("/api/v1/engagement/session", null, Map.of());
        UUID pageView = UUID.randomUUID();
        UUID event = UUID.randomUUID();
        Response counted = visitor.post("/api/v1/impressions", impression(event, "card", pageView), BROWSER);
        assertThat(counted.status()).as(String.valueOf(counted.json())).isEqualTo(200);
        assertThat(counted.json().get("counted").asBoolean()).isTrue();
        assertThat(counted.json().get("views").asLong()).isEqualTo(1);

        Response retry = visitor.post("/api/v1/impressions", impression(event, "card", pageView), BROWSER);
        assertThat(retry.json().get("counted").asBoolean()).isFalse();
        assertThat(retry.json().get("views").asLong()).isEqualTo(1);

        Response rerender = visitor.post("/api/v1/impressions", impression(UUID.randomUUID(), "card", pageView), BROWSER);
        assertThat(rerender.json().get("counted").asBoolean()).as("same page view, new event ID").isFalse();
        Response permalink = visitor.post("/api/v1/impressions", impression(UUID.randomUUID(), "permalink", pageView), BROWSER);
        assertThat(permalink.json().get("counted").asBoolean()).as("different source").isTrue();
        Response nextVisit = visitor.post("/api/v1/impressions", impression(UUID.randomUUID(), "card", UUID.randomUUID()), BROWSER);
        assertThat(nextVisit.json().get("views").asLong()).as("a new page view counts again").isEqualTo(3);

        Map<String, Object> reused = impression(event, "permalink", UUID.randomUUID());
        assertThat(visitor.post("/api/v1/impressions", reused, BROWSER).code()).isEqualTo("EVENT_ID_REUSED");

        assertThat(client().get("/api/v1/articles/by-slug/alkislik").json().get("stats").get("views").asLong())
                .as("reading does not count").isEqualTo(3);
        assertThat(client().get("/api/v1/articles/" + published.id() + "/stats").json().get("views").asLong()).isEqualTo(3);
    }

    @Test
    void invalidAutomatedAndHiddenEventsAreNotCounted() {
        ApiClient visitor = visitor();
        Response bot = visitor.post("/api/v1/impressions", impression(UUID.randomUUID(), "card", UUID.randomUUID()),
                Map.of("User-Agent", "Googlebot/2.1 (+http://www.google.com/bot.html)"));
        assertThat(bot.json().get("accepted").asBoolean()).isFalse();
        assertThat(bot.json().get("views").asLong()).isZero();

        Map<String, Object> old = Map.of("eventId", UUID.randomUUID().toString(), "articleId", published.text("id"),
                "source", "card", "pageViewId", UUID.randomUUID().toString(),
                "occurredAt", clock.instant().minus(Duration.ofDays(2)).toString());
        assertThat(visitor.post("/api/v1/impressions", old, BROWSER).status()).isEqualTo(422);
        Map<String, Object> panel = Map.of("eventId", UUID.randomUUID().toString(), "articleId", published.text("id"),
                "source", "panel", "pageViewId", UUID.randomUUID().toString(), "occurredAt", clock.instant().toString());
        assertThat(visitor.post("/api/v1/impressions", panel, BROWSER).status()).as("only card/permalink").isEqualTo(422);

        unpublish(owner, published);
        assertThat(visitor.post("/api/v1/impressions", impression(UUID.randomUUID(), "card", UUID.randomUUID()), BROWSER)
                .status()).isEqualTo(404);
        assertThat(clap(visitor, true).status()).isEqualTo(404);
        assertThat(visitor.get("/api/v1/articles/" + published.id() + "/stats").status()).isEqualTo(404);
        assertThat(visitor.get("/api/v1/articles/" + published.id() + "/my-clap").status()).isEqualTo(404);
    }

    @Test
    void concurrentClapsFromOneActorCountOnce() throws Exception {
        ApiClient visitor = visitor();
        visitor.post("/api/v1/engagement/session", null, Map.of());
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                futures.add(pool.submit(() -> clap(visitor, true).status()));
            }
            for (Future<Integer> future : futures) {
                assertThat(future.get()).isEqualTo(200);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(jdbc.sql("SELECT count(*) FROM article_clap").query(Long.class).single()).isEqualTo(1);
    }

    @Test
    void clapsAreRateLimited() {
        ApiClient visitor = visitor();
        visitor.post("/api/v1/engagement/session", null, Map.of());
        for (int i = 0; i < 30; i++) {
            assertThat(clap(visitor, i % 2 == 0).status()).isEqualTo(200);
        }
        Response limited = clap(visitor, true);
        assertThat(limited.status()).isEqualTo(429);
        assertThat(limited.header("Retry-After")).isNotNull();
    }

    @Test
    void seriesTotalsSumOnlyPublicChaptersAndOwnerSeesPerArticleTotals() {
        Response second = publish(owner, article("İkinci", "ikinci", "Metin."));
        Response series = owner.command("/api/v1/studio/series", Fixtures.series("Seri", "seri",
                List.of(published.text("id"), second.text("id")),
                List.of(Fixtures.version(owner.get("/api/v1/studio/articles/" + published.id())),
                        Fixtures.version(owner.get("/api/v1/studio/articles/" + second.id())))), null);
        owner.command("/api/v1/studio/series/" + series.id() + "/actions", Fixtures.action("publish"), series.etag());
        clap(visitor(), true);
        visitor().put("/api/v1/articles/" + second.id() + "/clap", Map.of("clapped", true), BROWSER);
        assertThat(client().get("/api/v1/series/by-slug/seri").json().get("stats").get("claps").asLong()).isEqualTo(2);

        unpublish(owner, second);
        assertThat(client().get("/api/v1/series/by-slug/seri").json().get("stats").get("claps").asLong())
                .as("hidden chapters do not contribute").isEqualTo(1);

        Response stats = owner.get("/api/v1/studio/article-stats");
        assertThat(stats.status()).isEqualTo(200);
        assertThat(stats.json().get("totalElements").asLong()).isEqualTo(2);
        assertThat(stats.json().get("items").get(0).has("title")).isTrue();

        createMember("okur@example.test", "uye-parolasi-123", true);
        ApiClient member = client();
        member.login("okur@example.test", "uye-parolasi-123");
        assertThat(member.get("/api/v1/studio/article-stats").status()).isEqualTo(403);
        assertThat(member.get("/api/v1/studio/members").status()).isEqualTo(403);
        Response members = owner.get("/api/v1/studio/members");
        assertThat(members.json().get("items")).hasSize(1);
        assertThat(members.json().get("items").get(0).get("email").asString()).isEqualTo("okur@example.test");
    }
}
