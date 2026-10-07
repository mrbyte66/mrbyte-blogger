package com.satir.support;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** JSON bodies for Studio requests. */
public final class Fixtures {

    public static final String SOFTWARE = "7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a01";
    public static final String LITERATURE = "7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a02";

    private Fixtures() {
    }

    public static Map<String, Object> article(String title, String slug, String... paragraphs) {
        List<Object> blocks = new ArrayList<>();
        for (String text : paragraphs) {
            blocks.add(Map.of("id", UUID.randomUUID().toString(), "type", "paragraph", "text", text));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", title);
        body.put("slug", slug);
        body.put("eyebrow", "YAZILIM");
        body.put("abstract", "Kısa özet");
        body.put("displayDate", "2026-10-01");
        body.put("categoryIds", List.of(SOFTWARE));
        body.put("document", Map.of("schemaVersion", 1, "blocks", blocks));
        body.put("presentation", Map.of("width", "comfortable", "heading", "left", "showMeta", true));
        body.put("seo", Map.of("indexable", true));
        body.put("cover", Map.of("mode", "none"));
        body.put("seriesPlacement", null);
        body.put("seriesVersions", List.of());
        return body;
    }

    public static Map<String, Object> with(Map<String, Object> body, String key, Object value) {
        Map<String, Object> copy = new LinkedHashMap<>(body);
        copy.put(key, value);
        return copy;
    }

    public static Map<String, Object> series(String title, String slug, List<String> chapterIds, List<Map<String, Object>> versions) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", title);
        body.put("slug", slug);
        body.put("summary", "Seri özeti");
        body.put("ongoing", true);
        body.put("cover", Map.of("mode", "none"));
        body.put("presentation", Map.of("heading", "left", "chapterStyle", "cards"));
        body.put("seo", Map.of("indexable", true));
        body.put("chapterIds", chapterIds);
        body.put("articleVersions", versions);
        return body;
    }

    public static Map<String, Object> version(ApiClient.Response edit) {
        return Map.of("id", edit.text("id"), "version", edit.version());
    }

    public static Map<String, Object> action(String action) {
        return Map.of("action", action);
    }

    public static String ifMatch(long version) {
        return "\"" + version + "\"";
    }

    /** Creates and publishes an article as the owner; returns the published edit view. */
    public static ApiClient.Response publish(ApiClient owner, Map<String, Object> body) {
        ApiClient.Response created = owner.command("/api/v1/studio/articles", body, null);
        if (created.status() != 201) {
            throw new IllegalStateException("create failed: " + created.json());
        }
        ApiClient.Response published = owner.command("/api/v1/studio/articles/" + created.id() + "/actions",
                action("publish"), created.etag());
        if (published.status() != 200) {
            throw new IllegalStateException("publish failed: " + published.json());
        }
        return published;
    }

    /** Moves a published article back to draft (it disappears from every public surface). */
    public static ApiClient.Response unpublish(ApiClient owner, ApiClient.Response edit) {
        ApiClient.Response current = owner.get("/api/v1/studio/articles/" + edit.id());
        return owner.command("/api/v1/studio/articles/" + edit.id() + "/actions", action("save-draft"), current.etag());
    }
}
