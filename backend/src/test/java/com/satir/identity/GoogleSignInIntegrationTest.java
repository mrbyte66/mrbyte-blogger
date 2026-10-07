package com.satir.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.util.UriComponentsBuilder;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;
import com.sun.net.httpserver.HttpServer;

/** Google OIDC against a local stub provider with real RS256-signed ID tokens. */
class GoogleSignInIntegrationTest extends IntegrationTest {

    private static final String CLIENT_ID = "test-client.apps.googleusercontent.com";
    private static final String ISSUER = "https://accounts.google.com";
    private static final RSAKey KEY;
    private static final HttpServer PROVIDER;
    /** Claims the stub token endpoint will put into the next ID token. */
    private static final AtomicReference<Map<String, Object>> NEXT = new AtomicReference<>();

    static {
        try {
            KEY = new RSAKeyGenerator(2048).keyID("test-key").generate();
            PROVIDER = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            PROVIDER.createContext("/jwks", exchange -> respond(exchange, new JWKSet(KEY.toPublicJWK()).toString()));
            PROVIDER.createContext("/token", exchange -> {
                try {
                    JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder().issuer(ISSUER).audience(CLIENT_ID)
                            .expirationTime(new Date(System.currentTimeMillis() + 300_000)).issueTime(new Date());
                    NEXT.get().forEach(claims::claim);
                    SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY.getKeyID()).build(), claims.build());
                    jwt.sign(new RSASSASigner(KEY));
                    respond(exchange, "{\"access_token\":\"x\",\"token_type\":\"Bearer\",\"id_token\":\"" + jwt.serialize() + "\"}");
                } catch (Exception e) {
                    exchange.sendResponseHeaders(500, -1);
                }
            });
            PROVIDER.start();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static void respond(com.sun.net.httpserver.HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    @DynamicPropertySource
    static void google(DynamicPropertyRegistry registry) {
        String base = "http://localhost:" + PROVIDER.getAddress().getPort();
        registry.add("satir.google.client-id", () -> CLIENT_ID);
        registry.add("satir.google.client-secret", () -> "test-secret");
        registry.add("satir.google.token-uri", () -> base + "/token");
        registry.add("satir.google.jwk-set-uri", () -> base + "/jwks");
    }

    @AfterAll
    static void stop() {
        PROVIDER.stop(0);
    }

    /** Runs start → provider → callback; returns the callback redirect. */
    private Response signIn(ApiClient api, String startPath, Map<String, Object> startBody, String sub, String email, boolean verified) {
        Response start = api.post(startPath, startBody);
        assertThat(start.status()).as(String.valueOf(start.json())).isEqualTo(200);
        var query = UriComponentsBuilder.fromUri(URI.create(start.text("authorizationUrl"))).build().getQueryParams();
        assertThat(query.getFirst("code_challenge_method")).isEqualTo("S256");
        assertThat(query.getFirst("scope")).isEqualTo("openid%20email%20profile");
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", sub);
        claims.put("email", email);
        claims.put("email_verified", verified);
        claims.put("name", "Google Okur");
        claims.put("nonce", query.getFirst("nonce"));
        NEXT.set(claims);
        return api.get("/api/v1/auth/google/callback?state=" + query.getFirst("state") + "&code=auth-code");
    }

    @Test
    void firstGoogleSignInCreatesAVerifiedMember() {
        ApiClient api = client();
        api.refreshCsrf();
        Response callback = signIn(api, "/api/v1/auth/google/start", Map.of("returnTo", "/hesap"), "g-1", "g@example.test", true);

        assertThat(callback.status()).isEqualTo(303);
        assertThat(callback.header("Location")).isEqualTo("/hesap?google=signed_in");
        Response me = api.get("/api/v1/me");
        assertThat(me.status()).isEqualTo(200);
        assertThat(me.text("email")).isEqualTo("g@example.test");
        assertThat(me.text("role")).isEqualTo("member");
        assertThat(api.get("/api/v1/me/connections").json().get("items").get(0).get("provider").asString()).isEqualTo("google");

        // The same Google subject signs in to the same account again.
        ApiClient again = client();
        again.refreshCsrf();
        assertThat(signIn(again, "/api/v1/auth/google/start", Map.of("returnTo", "/"), "g-1", "renamed@example.test", true)
                .header("Location")).isEqualTo("/?google=signed_in");
        assertThat(jdbc.sql("SELECT count(*) FROM app_user").query(Long.class).single()).isEqualTo(1);
    }

    @Test
    void existingAddressIsNeverMergedAutomatically() {
        createMember("var@example.test", "var-olan-parola-1", true);
        ApiClient api = client();
        api.refreshCsrf();
        Response callback = signIn(api, "/api/v1/auth/google/start", Map.of("returnTo", "/giris"), "g-2", "VAR@example.test", true);
        assertThat(callback.header("Location")).isEqualTo("/giris?google_error=account_exists");
        assertThat(api.get("/api/v1/auth/session").json().get("authenticated").asBoolean()).isFalse();
    }

    @Test
    void forgedStateUnverifiedEmailAndOpenRedirectsAreRejected() {
        ApiClient api = client();
        api.refreshCsrf();
        api.post("/api/v1/auth/google/start", Map.of("returnTo", "https://evil.example/steal"));
        Response forged = api.get("/api/v1/auth/google/callback?state=forged&code=x");
        assertThat(forged.header("Location")).isEqualTo("/?google_error=google_state");

        Response unverified = signIn(api, "/api/v1/auth/google/start", Map.of("returnTo", "//evil.example"), "g-3", "u@example.test", false);
        assertThat(unverified.header("Location")).isEqualTo("/?google_error=google_email_unverified");
        assertThat(jdbc.sql("SELECT count(*) FROM app_user").query(Long.class).single()).isZero();
    }

    @Test
    void ownerCannotUseGoogle() {
        UUID ownerId = createOwner();
        jdbc.sql("INSERT INTO external_identity (id, user_id, provider, subject, created_at) VALUES (:id, :user, 'GOOGLE', 'g-owner', :now)")
                .param("id", UUID.randomUUID()).param("user", ownerId).param("now", new Timestamp(System.currentTimeMillis())).update();
        ApiClient api = client();
        api.refreshCsrf();
        Response callback = signIn(api, "/api/v1/auth/google/start", Map.of("returnTo", "/"), "g-owner", "x@example.test", true);
        assertThat(callback.header("Location")).isEqualTo("/?google_error=owner_google_disabled");
        assertThat(api.get("/api/v1/studio/articles").status()).isEqualTo(401);
    }

    @Test
    void linkingNeedsReauthAndTheLastLoginMethodCannotBeRemoved() {
        createMember("okur@example.test", "okur-parolasi-123", true);
        ApiClient api = client();
        api.login("okur@example.test", "okur-parolasi-123");
        api.refreshCsrf();
        assertThat(api.post("/api/v1/me/connections/google/start", Map.of("returnTo", "/hesap")).code()).isEqualTo("REAUTH_REQUIRED");

        api.post("/api/v1/auth/reauthenticate", Map.of("password", "okur-parolasi-123"));
        Response linked = signIn(api, "/api/v1/me/connections/google/start", Map.of("returnTo", "/hesap"), "g-link", "okur@example.test", true);
        assertThat(linked.header("Location")).isEqualTo("/hesap?google=linked");
        assertThat(api.get("/api/v1/me/connections").json().get("items")).hasSize(1);
        assertThat(api.delete("/api/v1/me/connections/google", null, Map.of()).status()).as("has password").isEqualTo(204);

        // A Google-only account cannot unlink its only way to sign in.
        ApiClient googleOnly = client();
        googleOnly.refreshCsrf();
        signIn(googleOnly, "/api/v1/auth/google/start", Map.of("returnTo", "/"), "g-only", "only@example.test", true);
        googleOnly.refreshCsrf();
        Response reauth = signIn(googleOnly, "/api/v1/auth/google/start", Map.of("returnTo", "/hesap", "purpose", "reauth"),
                "g-only", "only@example.test", true);
        assertThat(reauth.header("Location")).isEqualTo("/hesap?google=reauthenticated");
        googleOnly.refreshCsrf();
        assertThat(googleOnly.delete("/api/v1/me/connections/google", null, Map.of()).code()).isEqualTo("LAST_LOGIN_METHOD");
    }
}
