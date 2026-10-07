package com.satir.platform;

import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.ifMatch;
import static com.satir.support.Fixtures.publish;
import static com.satir.support.Fixtures.series;
import static com.satir.support.Fixtures.version;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

/**
 * Success responses of operations the behavioural tests reach only through errors (or not at all), so that
 * {@code ApiClient} checks their documented schemas as well. Behaviour itself is covered elsewhere.
 */
class OpenApiContractIntegrationTest extends IntegrationTest {

    private static final String EMAIL = "sozlesme@example.test";
    private static final String PASSWORD = "sozlesme-parolasi-1";

    @Test
    void studioEditorialSuccessResponsesMatchTheContract() {
        createOwner();
        ApiClient owner = ownerClient();

        Response category = owner.post("/api/v1/studio/categories", Map.of("name", "Deneme", "slug", "deneme"));
        assertThat(category.status()).isEqualTo(201);
        Response renamed = owner.patch("/api/v1/studio/categories/" + category.id(), Map.of("name", "Deneme 2"),
                Map.of("If-Match", category.etag()));
        assertThat(renamed.status()).isEqualTo(200);
        assertThat(owner.delete("/api/v1/studio/categories/" + category.id(), null, Map.of("If-Match", renamed.etag())).status())
                .isEqualTo(204);

        Response first = publish(owner, article("Birinci bölüm", "birinci-bolum", "Metin."));
        Response created = owner.command("/api/v1/studio/series",
                series("Sözleşme serisi", "sozlesme-serisi", List.of(first.text("id")), List.of(version(first))), null);
        assertThat(created.status()).isEqualTo(201);
        Response published = owner.command("/api/v1/studio/series/" + created.id() + "/actions", Map.of("action", "publish"),
                created.etag());
        assertThat(published.status()).isEqualTo(200);
        assertThat(owner.get("/api/v1/studio/series").status()).isEqualTo(200);
        assertThat(client().get("/api/v1/series").json().get("totalElements").asLong()).isEqualTo(1);

        Response current = owner.get("/api/v1/studio/articles/" + first.id());
        Response updated = owner.put("/api/v1/studio/series/" + created.id(),
                series("Sözleşme serisi 2", "sozlesme-serisi", List.of(first.text("id")), List.of()),
                Map.of("If-Match", ifMatch(published.version())));
        assertThat(updated.status()).isEqualTo(200);
        assertThat(owner.delete("/api/v1/studio/series/" + created.id(), null, Map.of("If-Match", updated.etag())).status())
                .isEqualTo(204);
        assertThat(owner.delete("/api/v1/studio/articles/" + first.id(), null, Map.of("If-Match", current.etag())).status())
                .isEqualTo(204);

        jdbc.sql("UPDATE outbox_job SET state = 'FAILED', last_error_code = 'MAIL_SEND_FAILED'").update();
        Response jobs = owner.get("/api/v1/studio/publication-jobs?state=failed");
        assertThat(jobs.json().get("items")).isNotEmpty();
        String jobId = jobs.json().get("items").get(0).get("id").asString();
        assertThat(owner.post("/api/v1/studio/publication-jobs/" + jobId + "/retry", Map.of()).status()).isEqualTo(204);
    }

    @Test
    void studioSiteAndMediaSuccessResponsesMatchTheContract() throws Exception {
        createOwner();
        ApiClient owner = ownerClient();

        Response workspace = owner.get("/api/v1/studio/theme");
        Map<String, Object> intro = Map.of("kind", "intro", "id", "giris", "title", "Merhaba", "description", "Açıklama",
                "eyebrow", "", "layout", "statement");
        Map<String, Object> theme = Map.of("schemaVersion", 1, "name", "Sade", "siteName", "SATIR", "accent", "#336699",
                "typography", "editorial", "surface", "night", "width", "wide", "spacing", "compact", "blocks", List.of(intro));
        Response draft = owner.put("/api/v1/studio/theme/draft", theme, Map.of("If-Match", workspace.etag()));
        Response applied = owner.post("/api/v1/studio/theme/apply", Map.of("draftRevisionId", draft.text("draftRevisionId")),
                Map.of("If-Match", draft.etag()));
        assertThat(applied.status()).isEqualTo(200);
        assertThat(client().get("/api/v1/site").status()).isEqualTo(200);
        Response restored = owner.post("/api/v1/studio/theme/restore", Map.of(), Map.of("If-Match", applied.etag()));
        assertThat(restored.status()).isEqualTo(200);

        Response upload = owner.upload("/api/v1/studio/media", "kare.png", png());
        assertThat(upload.status()).isEqualTo(202);
        assertThat(owner.get("/api/v1/studio/media/" + upload.id()).status()).isEqualTo(200);
        assertThat(owner.delete("/api/v1/studio/media/" + upload.id(), null, Map.of()).status()).isEqualTo(204);

        // A finished provider search, stored as CoverSearchService stores it (the provider is not reachable in tests).
        java.util.UUID job = java.util.UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO cover_job (id, resource_type, resource_id, state, candidates, created_by, created_at)
                VALUES (:id, 'ARTICLE', :resource, 'DONE', CAST(:candidates AS jsonb), (SELECT id FROM app_user LIMIT 1), now())
                """)
                .param("id", job).param("resource", java.util.UUID.randomUUID())
                .param("candidates", """
                        [{"candidateId": "pexels-1", "thumbnailUrl": "https://images.pexels.com/photos/1/k.jpeg",
                          "downloadUrl": "https://images.pexels.com/photos/1/b.jpeg", "sourceUrl": "https://www.pexels.com/photo/1/",
                          "photographer": "Foto Grafçı", "photographerUrl": "https://www.pexels.com/@f",
                          "licenseUrl": "https://www.pexels.com/license/", "alt": "Deniz"}]
                        """)
                .update();
        assertThat(owner.get("/api/v1/studio/cover-jobs/" + job).status()).isEqualTo(200);
        assertThat(owner.post("/api/v1/studio/cover-jobs/" + job + "/select", Map.of("candidateId", "yok")).status())
                .isEqualTo(422);
    }

    private static byte[] png() throws java.io.IOException {
        var image = new java.awt.image.BufferedImage(40, 30, java.awt.image.BufferedImage.TYPE_INT_RGB);
        var out = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    @Test
    void memberSuccessResponsesMatchTheContract() {
        ApiClient api = client();
        api.refreshCsrf();
        api.post("/api/v1/auth/register", Map.of("name", "Sözleşme", "email", EMAIL, "password", PASSWORD,
                "passwordConfirmation", PASSWORD));
        assertThat(api.post("/api/v1/auth/verification/resend", Map.of("email", EMAIL)).status()).isEqualTo(202);
        api.post("/api/v1/auth/verification/confirm", Map.of("token", mail.lastToken(EMAIL).orElseThrow()));
        api.login(EMAIL, PASSWORD);
        api.refreshCsrf();
        assertThat(api.post("/api/v1/auth/session/renew", Map.of()).status()).isEqualTo(200);

        Response collection = api.command("/api/v1/me/collections", Map.of("name", "Okunacaklar"), null);
        assertThat(api.patch("/api/v1/me/collections/" + collection.id(), Map.of("name", "Okundu"),
                Map.of("If-Match", collection.etag())).status()).isEqualTo(200);

        assertThat(api.post("/api/v1/auth/reauthenticate", Map.of("password", PASSWORD)).status()).isEqualTo(200);
        assertThat(api.post("/api/v1/me/sessions/revoke-others", Map.of()).status()).isEqualTo(204);
    }
}
