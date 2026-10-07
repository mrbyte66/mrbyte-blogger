package com.satir.demo.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.satir.editorial.application.ArticleCommands;
import com.satir.editorial.application.CategoryCommands;
import com.satir.editorial.application.SeriesCommands;
import com.satir.editorial.application.StudioContentQuery;
import com.satir.engagement.application.EngagementService;
import com.satir.identity.application.DemoAccounts;
import com.satir.library.application.LibraryService;
import com.satir.media.application.MediaService;
import com.satir.reading.application.HistoryService;
import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

import tools.jackson.databind.json.JsonMapper;

/** {@code seed-demo}: demo content through the editorial services, verified test members, idempotency, dev only. */
class DemoSeedIntegrationTest extends IntegrationTest {

    @Autowired
    private DemoSeeder seeder;

    @Autowired
    private DemoAccounts accounts;
    @Autowired
    private CategoryCommands categories;
    @Autowired
    private ArticleCommands articles;
    @Autowired
    private SeriesCommands series;
    @Autowired
    private StudioContentQuery studio;
    @Autowired
    private MediaService media;
    @Autowired
    private LibraryService library;
    @Autowired
    private HistoryService history;
    @Autowired
    private EngagementService engagement;
    @Autowired
    private JsonMapper json;
    @Autowired
    private Clock clockBean;

    private long count(String sql) {
        return jdbc.sql(sql).query(Long.class).single();
    }

    @Test
    void seedsContentAndVerifiedMembersThroughTheApplicationRules() {
        createOwner();
        DemoSeeder.Report report = seeder.seed();
        assertThat(report).isEqualTo(new DemoSeeder.Report(2, 25, 4, 3));

        ApiClient visitor = client();
        assertThat(visitor.get("/api/v1/articles?size=50").json().get("totalElements").asLong()).isEqualTo(19);
        assertThat(visitor.get("/api/v1/series").json().get("totalElements").asLong()).isEqualTo(4);
        assertThat(visitor.get("/api/v1/articles/by-slug/kilitli-yillik-degerlendirme").status()).isEqualTo(404);
        assertThat(visitor.get("/api/v1/articles/by-slug/taslak-kis-listesi").status()).isEqualTo(404);
        assertThat(visitor.get("/api/v1/articles/by-slug/java-kayit-siniflari").status()).isEqualTo(200);

        ApiClient owner = ownerClient();
        assertThat(owner.get("/api/v1/studio/articles?status=scheduled").json().get("totalElements").asLong()).isEqualTo(2);
        assertThat(owner.get("/api/v1/studio/articles?visibility=private").json().get("totalElements").asLong()).isEqualTo(2);
        assertThat(count("SELECT count(*) FROM media_asset WHERE state = 'READY'")).isEqualTo(14);

        for (int n = 1; n <= 3; n++) {
            ApiClient member = client();
            assertThat(member.login("uye" + n + "@gmail.com", "uye" + n + "_123456789").status()).isEqualTo(200);
            Response me = member.get("/api/v1/me");
            assertThat(me.text("name")).isEqualTo("uye" + n);
            assertThat(me.json().get("verified").asBoolean()).isTrue();
        }
        ApiClient first = client();
        first.login("uye1@gmail.com", "uye1_123456789");
        assertThat(first.get("/api/v1/me/bookmarks").json().get("totalElements").asLong()).isEqualTo(4);
        assertThat(first.get("/api/v1/me/history").json().get("totalElements").asLong()).isEqualTo(5);
        assertThat(first.get("/api/v1/me/collections").json().get("items").size()).isEqualTo(2);
        assertThat(count("SELECT count(*) FROM article_clap")).isEqualTo(6);
    }

    @Test
    void secondRunAddsNothingAndLeavesExistingContentAlone() {
        createOwner();
        seeder.seed();
        long revisions = count("SELECT count(*) FROM article_revision");
        long users = count("SELECT count(*) FROM app_user");
        long bookmarks = count("SELECT count(*) FROM bookmark");

        assertThat(seeder.seed()).isEqualTo(new DemoSeeder.Report(0, 0, 0, 0));
        assertThat(count("SELECT count(*) FROM article_revision")).isEqualTo(revisions);
        assertThat(count("SELECT count(*) FROM app_user")).isEqualTo(users);
        assertThat(count("SELECT count(*) FROM bookmark")).isEqualTo(bookmarks);
    }

    @Test
    void requiresTheOwnerAccount() {
        assertThatThrownBy(seeder::seed).isInstanceOf(IllegalStateException.class).hasMessageContaining("bootstrap-owner");
        assertThat(count("SELECT count(*) FROM app_user")).isZero();
    }

    @Test
    void isRefusedOutsideDevAndCreatesNoAccounts() throws IOException {
        createOwner();
        DemoSeeder production = new DemoSeeder(accounts, categories, articles, series, studio, media, library, history,
                engagement, json, clockBean, false);
        assertThatThrownBy(production::seed).isInstanceOf(IllegalStateException.class).hasMessageContaining("dev");
        assertThat(count("SELECT count(*) FROM app_user WHERE email LIKE 'uye%'")).isZero();
        assertThat(count("SELECT count(*) FROM article")).isZero();

        // The production configuration never enables seeding (only application-dev.yml and the test profile do).
        try (InputStream in = getClass().getResourceAsStream("/application.yml")) {
            assertThat(new String(in.readAllBytes(), StandardCharsets.UTF_8)).doesNotContain("seed:");
        }
    }
}
