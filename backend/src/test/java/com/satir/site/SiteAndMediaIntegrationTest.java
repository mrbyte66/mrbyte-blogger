package com.satir.site;

import static com.satir.support.Fixtures.action;
import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.with;
import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

class SiteAndMediaIntegrationTest extends IntegrationTest {

    static byte[] png(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, 0xFF0000);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private Response publishWithCover(ApiClient owner, String slug, String assetId, String visibility) {
        Map<String, Object> body = with(article("Kapaklı " + slug, slug, "Metin."), "cover", Map.of("mode", "manual", "assetId", assetId));
        if (visibility != null) {
            body = with(body, "visibility", visibility);
        }
        Response created = owner.command("/api/v1/studio/articles", body, null);
        assertThat(created.status()).as(String.valueOf(created.json())).isEqualTo(201);
        return "private".equals(visibility) ? created
                : owner.command("/api/v1/studio/articles/" + created.id() + "/actions", action("publish"), created.etag());
    }

    @Test
    void uploadedImagesAreServedOnlyWhilePublic() throws IOException {
        createOwner();
        ApiClient owner = ownerClient();
        Response upload = owner.upload("/api/v1/studio/media", "kapak.png", png(64, 32));
        assertThat(upload.status()).isEqualTo(202);
        assertThat(upload.text("state")).isEqualTo("ready");
        assertThat(upload.json().get("width").asInt()).isEqualTo(64);
        String assetId = upload.text("id");
        String url = "/api/v1/media/" + assetId;

        ApiClient visitor = client();
        assertThat(visitor.get(url).status()).as("unreferenced upload is private").isEqualTo(404);
        assertThat(owner.get(url).status()).isEqualTo(200);

        Response live = publishWithCover(owner, "kapakli", assetId, null);
        Response image = visitor.get(url);
        assertThat(image.status()).isEqualTo(200);
        assertThat(image.header("Content-Type")).isEqualTo("image/png");
        assertThat(image.header("Cache-Control")).contains("no-store");
        assertThat(ImageIO.read(new ByteArrayInputStream(image.bytes())).getWidth()).isEqualTo(64);
        assertThat(visitor.get("/api/v1/articles/by-slug/kapakli").json().get("cover").get("url").asString()).isEqualTo(url);

        assertThat(owner.delete("/api/v1/studio/media/" + assetId, null, Map.of()).code()).isEqualTo("MEDIA_IN_USE");
        owner.command("/api/v1/studio/articles/" + live.id() + "/actions", action("make-private"), live.etag());
        assertThat(visitor.get(url).status()).as("taking content private stops serving its media").isEqualTo(404);
    }

    @Test
    void privateMediaCannotBeSharedWithPublicContent() throws IOException {
        createOwner();
        ApiClient owner = ownerClient();
        String assetId = owner.upload("/api/v1/studio/media", "a.png", png(8, 8)).text("id");
        publishWithCover(owner, "gizli", assetId, "private");

        Response shared = owner.command("/api/v1/studio/articles",
                with(article("Açık", "acik", "x"), "cover", Map.of("mode", "manual", "assetId", assetId)), null);
        assertThat(shared.status()).isEqualTo(409);
        assertThat(shared.code()).isEqualTo("ASSET_SHARED_ACROSS_VISIBILITY");
    }

    @Test
    void onlyRealJpegAndPngAreAccepted() throws IOException {
        createOwner();
        ApiClient owner = ownerClient();
        byte[] svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8);
        Response rejected = owner.upload("/api/v1/studio/media", "logo.png", svg);
        assertThat(rejected.status()).isEqualTo(415);
        assertThat(rejected.code()).isEqualTo("MEDIA_TYPE_UNSUPPORTED");

        byte[] truncated = java.util.Arrays.copyOf(png(16, 16), 20);
        assertThat(owner.upload("/api/v1/studio/media", "broken.png", truncated).code()).isEqualTo("MEDIA_DECODE_FAILED");
        assertThat(client().upload("/api/v1/studio/media", "x.png", png(4, 4)).status()).isIn(401, 403);
    }

    @Test
    void coverSearchReportsAMissingProvider() {
        createOwner();
        ApiClient owner = ownerClient();
        Response response = owner.post("/api/v1/studio/cover-jobs",
                Map.of("resourceType", "article", "resourceId", java.util.UUID.randomUUID().toString(), "query", "deniz"), Map.of());
        assertThat(response.status()).isEqualTo(503);
        assertThat(response.code()).isEqualTo("COVER_PROVIDER_UNAVAILABLE");
    }

    private Map<String, Object> theme(String featuredArticleId) {
        Map<String, Object> scene = new LinkedHashMap<>();
        scene.put("kind", "scene");
        scene.put("id", "block-scene");
        scene.put("title", "Kod yazarım.");
        scene.put("emphasis", "Bazen de satır.");
        scene.put("description", "Açıklama");
        scene.put("featuredArticleId", featuredArticleId);
        scene.put("showFeaturedArticle", true);
        scene.put("featuredSeriesId", null);
        scene.put("showFeaturedSeries", false);
        Map<String, Object> theme = new LinkedHashMap<>();
        theme.put("schemaVersion", 1);
        theme.put("name", "Karakterli evren");
        theme.put("siteName", "SATIR");
        theme.put("accent", "mint");
        theme.put("typography", "modern");
        theme.put("surface", "paper");
        theme.put("width", "reading");
        theme.put("spacing", "airy");
        theme.put("blocks", List.of(scene));
        return theme;
    }

    @Test
    void themeDraftStaysPrivateUntilApplied() {
        createOwner();
        ApiClient owner = ownerClient();
        Response live = owner.command("/api/v1/studio/articles", article("Öne çıkan", "one-cikan", "x"), null);
        live = owner.command("/api/v1/studio/articles/" + live.id() + "/actions", action("publish"), live.etag());

        Response workspace = owner.get("/api/v1/studio/theme");
        assertThat(workspace.json().get("applied").isNull()).isTrue();
        Response draft = owner.put("/api/v1/studio/theme/draft", theme(live.text("id")), Map.of("If-Match", workspace.etag()));
        assertThat(draft.status()).as(String.valueOf(draft.json())).isEqualTo(200);

        ApiClient visitor = client();
        assertThat(visitor.get("/api/v1/site").json().has("theme")).as("draft is not public").isFalse();

        Response applied = owner.post("/api/v1/studio/theme/apply", Map.of("draftRevisionId", draft.text("draftRevisionId")),
                Map.of("If-Match", draft.etag()));
        assertThat(applied.status()).isEqualTo(200);
        Response site = visitor.get("/api/v1/site");
        assertThat(site.text("siteName")).isEqualTo("SATIR");
        assertThat(site.json().get("theme").get("blocks").get(0).get("featuredArticleId").asString()).isEqualTo(live.text("id"));

        // Hiding the featured article later removes the binding from the public projection.
        owner.command("/api/v1/studio/articles/" + live.id() + "/actions", action("archive"), live.etag());
        assertThat(visitor.get("/api/v1/site").json().get("theme").get("blocks").get(0).get("featuredArticleId").isNull()).isTrue();
    }

    @Test
    void applyRefusesHiddenFeaturedContentAndStaleDrafts() {
        createOwner();
        ApiClient owner = ownerClient();
        Response draftArticle = owner.command("/api/v1/studio/articles", article("Taslak", "taslak", "x"), null);
        Response workspace = owner.get("/api/v1/studio/theme");
        Response draft = owner.put("/api/v1/studio/theme/draft", theme(draftArticle.text("id")), Map.of("If-Match", workspace.etag()));

        Response hidden = owner.post("/api/v1/studio/theme/apply", Map.of("draftRevisionId", draft.text("draftRevisionId")),
                Map.of("If-Match", draft.etag()));
        assertThat(hidden.status()).isEqualTo(422);
        assertThat(hidden.json().get("errors").get(0).get("code").asString()).isEqualTo("NOT_PUBLIC");

        Response wrongRevision = owner.post("/api/v1/studio/theme/apply",
                Map.of("draftRevisionId", java.util.UUID.randomUUID().toString()), Map.of("If-Match", draft.etag()));
        assertThat(wrongRevision.code()).isEqualTo("DRAFT_CHANGED");
    }

    @Test
    void sitemapNeedsBothOwnerSettingAndDeploymentGate() {
        createOwner();
        ApiClient owner = ownerClient();
        Response live = owner.command("/api/v1/studio/articles", article("İndekslenir", "indekslenir", "x"), null);
        owner.command("/api/v1/studio/articles/" + live.id() + "/actions", action("publish"), live.etag());
        Response hidden = owner.command("/api/v1/studio/articles",
                with(article("Noindex", "noindex", "x"), "seo", Map.of("indexable", false)), null);
        owner.command("/api/v1/studio/articles/" + hidden.id() + "/actions", action("publish"), hidden.etag());

        ApiClient visitor = client();
        assertThat(visitor.get("/api/v1/seo/urls").json().get("items")).as("owner setting off").isEmpty();
        assertThat(visitor.get("/api/v1/site").json().get("indexingEnabled").asBoolean()).isFalse();

        Response settings = owner.get("/api/v1/studio/site");
        Response enabled = owner.patch("/api/v1/studio/site", Map.of("indexingEnabled", true), Map.of("If-Match", settings.etag()));
        assertThat(enabled.json().get("deploymentIndexingEnabled").asBoolean()).isTrue();

        Response urls = visitor.get("/api/v1/seo/urls");
        assertThat(urls.json().get("items")).hasSize(1);
        assertThat(urls.json().get("items").get(0).get("path").asString()).isEqualTo("/yazilar/indekslenir");
        assertThat(urls.json().get("items").get(0).get("lastModified").asString()).isNotBlank();
    }
}
