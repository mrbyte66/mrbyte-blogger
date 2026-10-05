package com.satir.support;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A browser-like HTTP client for integration tests: real cookies (session), CSRF header handling
 * and JSON bodies, against the running server on a random port. Redirects are not followed.
 */
public final class ApiClient {

    public static final String SESSION_COOKIE = "satir-session-dev";

    public record Response(int status, java.net.http.HttpHeaders headers, JsonNode json, byte[] bytes) {
        public String header(String name) {
            return headers.firstValue(name).orElse(null);
        }

        public String code() {
            return json == null || json.get("code") == null ? null : json.get("code").asString();
        }

        public String etag() {
            return header("ETag");
        }

        public String text(String field) {
            JsonNode node = json == null ? null : json.get(field);
            return node == null || node.isNull() ? null : node.asString();
        }

        public UUID id() {
            return UUID.fromString(text("id"));
        }

        public long version() {
            return json.get("version").asLong();
        }
    }

    public static final JsonMapper JSON = JsonMapper.builder().build();

    private final String baseUrl;
    private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
    private final HttpClient http;
    private String csrfToken;

    public ApiClient(int port) {
        this.baseUrl = "http://localhost:" + port;
        this.http = HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    /** Fetches a fresh CSRF token (required after login/logout, which rotate it). */
    public String refreshCsrf() {
        Response response = get("/api/v1/auth/csrf");
        csrfToken = response.json().get("token").asString();
        return csrfToken;
    }

    public void useCsrfToken(String token) {
        this.csrfToken = token;
    }

    public Response get(String path) {
        return send(HttpRequest.newBuilder(uri(path)).GET(), Map.of());
    }

    public Response get(String path, Map<String, String> headers) {
        return send(HttpRequest.newBuilder(uri(path)).GET(), headers);
    }

    public Response post(String path, Object body) {
        return post(path, body, true);
    }

    public Response post(String path, Object body, boolean withCsrf) {
        return send("POST", path, body, withCsrf ? Map.of() : null);
    }

    public Response post(String path, Object body, Map<String, String> headers) {
        return send("POST", path, body, headers);
    }

    public Response put(String path, Object body, Map<String, String> headers) {
        return send("PUT", path, body, headers);
    }

    public Response patch(String path, Object body, Map<String, String> headers) {
        return send("PATCH", path, body, headers);
    }

    public Response delete(String path, Object body, Map<String, String> headers) {
        return send("DELETE", path, body, headers);
    }

    /** POST command with a fresh Idempotency-Key and optional If-Match. */
    public Response command(String path, Object body, String ifMatch) {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Idempotency-Key", UUID.randomUUID().toString());
        if (ifMatch != null) {
            headers.put("If-Match", ifMatch);
        }
        return post(path, body, headers);
    }

    public Response upload(String path, String filename, byte[] content) {
        String boundary = "----satir" + UUID.randomUUID();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + filename
                + "\"\r\nContent-Type: application/octet-stream\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.writeBytes(content);
        out.writeBytes(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray()));
        if (csrfToken != null) {
            builder.header("X-CSRF-TOKEN", csrfToken);
        }
        return send(builder, Map.of());
    }

    public Response login(String identifier, String password) {
        if (csrfToken == null) {
            refreshCsrf();
        }
        return post("/api/v1/auth/login", Map.of("identifier", identifier, "password", password));
    }

    public Optional<String> sessionCookie() {
        return cookies.getCookieStore().getCookies().stream()
                .filter(cookie -> cookie.getName().equals(SESSION_COOKIE))
                .map(HttpCookie::getValue)
                .findFirst();
    }

    public void setSessionCookie(String value) {
        cookies.getCookieStore().removeAll();
        HttpCookie cookie = new HttpCookie(SESSION_COOKIE, value);
        cookie.setPath("/");
        cookie.setVersion(0);
        cookies.getCookieStore().add(URI.create(baseUrl), cookie);
    }

    private Response send(String method, String path, Object body, Map<String, String> headers) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(body instanceof String s ? s : JSON.writeValueAsString(body)));
        if (headers != null && csrfToken != null) {
            builder.header("X-CSRF-TOKEN", csrfToken);
        }
        return send(builder, headers == null ? Map.of() : headers);
    }

    private URI uri(String path) {
        return URI.create(baseUrl + path);
    }

    private Response send(HttpRequest.Builder builder, Map<String, String> headers) {
        headers.forEach(builder::header);
        try {
            HttpResponse<byte[]> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            byte[] bytes = response.body();
            String type = response.headers().firstValue("Content-Type").orElse("");
            JsonNode json = bytes.length == 0 || !type.contains("json") ? null : JSON.readTree(bytes);
            return new Response(response.statusCode(), response.headers(), json, bytes);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
