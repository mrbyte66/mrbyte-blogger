package com.satir.media.infrastructure;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Pexels search and download (provider candidate in docs/features/automatic-covers.md). Only the
 * configured API host is queried and only images.pexels.com is downloaded, over HTTPS, without
 * following redirects, within size and time limits. No generic URL downloader exists.
 */
@Component
public class PexelsClient {

    public record Candidate(String candidateId, String thumbnailUrl, String downloadUrl, String sourceUrl,
            String photographer, String photographerUrl, String licenseUrl, String alt) {
    }

    public static final String LICENSE_URL = "https://www.pexels.com/license/";
    private static final String IMAGE_HOST = "images.pexels.com";
    private static final long MAX_DOWNLOAD = 10L * 1024 * 1024;

    private final String apiKey;
    private final String apiBase;
    private final JsonMapper json;
    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    PexelsClient(@Value("${satir.covers.pexels-api-key:}") String apiKey,
            @Value("${satir.covers.pexels-api-base:https://api.pexels.com/v1}") String apiBase, JsonMapper json) {
        this.apiKey = apiKey;
        this.apiBase = apiBase;
        this.json = json;
    }

    public boolean configured() {
        return !apiKey.isBlank();
    }

    public Optional<List<Candidate>> search(String query) {
        URI uri = UriComponentsBuilder.fromUriString(apiBase + "/search")
                .queryParam("query", query).queryParam("per_page", 12).queryParam("orientation", "landscape")
                .encode().build().toUri();
        try {
            HttpResponse<String> response = http.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                    .header("Authorization", apiKey).GET().build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return Optional.empty();
            }
            List<Candidate> candidates = new ArrayList<>();
            for (JsonNode photo : json.readTree(response.body()).path("photos")) {
                JsonNode src = photo.path("src");
                candidates.add(new Candidate(photo.path("id").asString(), src.path("medium").asString(),
                        src.path("large2x").asString(), photo.path("url").asString(), photo.path("photographer").asString(),
                        photo.path("photographer_url").asString(), LICENSE_URL, photo.path("alt").asString()));
            }
            return Optional.of(candidates);
        } catch (IOException e) {
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    public Optional<byte[]> download(String url) {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (!"https".equals(uri.getScheme()) || !IMAGE_HOST.equals(uri.getHost())) {
            return Optional.empty();
        }
        try {
            HttpResponse<InputStream> response = http.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(20)).GET().build(),
                    HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream body = response.body()) {
                if (response.statusCode() != 200) {
                    return Optional.empty();
                }
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                long total = 0;
                int read;
                while ((read = body.read(buffer)) != -1) {
                    total += read;
                    if (total > MAX_DOWNLOAD) {
                        return Optional.empty();
                    }
                    out.write(buffer, 0, read);
                }
                return Optional.of(out.toByteArray());
            }
        } catch (IOException e) {
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }
}
