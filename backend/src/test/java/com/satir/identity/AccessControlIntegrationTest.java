package com.satir.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.IntegrationTest;

/** Server-side role rules: only the owner reaches Studio; membership never grants authoring. */
class AccessControlIntegrationTest extends IntegrationTest {

    private static final String STUDIO = "/api/v1/studio/test-probe";

    @Test
    void anonymousCallersAreUnauthenticatedForStudioAndMe() {
        ApiClient api = client();

        ApiClient.Response studio = api.get(STUDIO);
        assertThat(studio.status()).isEqualTo(401);
        assertThat(studio.code()).isEqualTo("UNAUTHENTICATED");
        assertThat(studio.json().get("requestId").asString()).isEqualTo(studio.header("X-Request-Id"));
        assertThat(api.get("/api/v1/me").status()).isEqualTo(401);
    }

    @Test
    void ownerReachesStudio() {
        createOwner();
        ApiClient api = client();
        api.login(OWNER_EMAIL, OWNER_PASSWORD);

        assertThat(api.get(STUDIO).status()).isEqualTo(200);
    }

    @Test
    void verifiedMemberIsForbiddenFromStudio() {
        createMember("okur@example.test", "okur-parolasi-123", true);
        ApiClient api = client();
        ApiClient.Response login = api.login("okur@example.test", "okur-parolasi-123");
        assertThat(login.json().get("role").asString()).isEqualTo("member");

        ApiClient.Response studio = api.get(STUDIO);

        assertThat(studio.status()).isEqualTo(403);
        assertThat(studio.code()).isEqualTo("FORBIDDEN");
        assertThat(api.get("/api/v1/me").status()).isEqualTo(200);
    }

    @Test
    void unverifiedMemberCanOnlyReadSessionState() {
        createMember("yeni@example.test", "yeni-parolasi-123", false);
        ApiClient api = client();
        api.login("yeni@example.test", "yeni-parolasi-123");

        ApiClient.Response me = api.get("/api/v1/me");
        assertThat(me.status()).isEqualTo(403);
        assertThat(me.code()).isEqualTo("EMAIL_VERIFICATION_REQUIRED");
        assertThat(api.get(STUDIO).status()).isEqualTo(403);
        ApiClient.Response session = api.get("/api/v1/auth/session");
        assertThat(session.json().get("authenticated").asBoolean()).isTrue();
        assertThat(session.json().get("profile").get("verified").asBoolean()).isFalse();
    }

    @Test
    void legacyNextStudioCookieGrantsNothing() {
        createOwner();

        ApiClient.Response response = client().get(STUDIO, Map.of("Cookie", "mrbyte-studio=forged.signature"));

        assertThat(response.status()).isEqualTo(401);
    }

    @Test
    void clientSuppliedRoleFieldsAreRejectedNotIgnored() {
        createMember("okur@example.test", "okur-parolasi-123", true);
        ApiClient api = client();
        api.refreshCsrf();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("identifier", "okur@example.test");
        body.put("password", "okur-parolasi-123");
        body.put("role", "owner");

        ApiClient.Response response = api.post("/api/v1/auth/login", body);

        assertThat(response.status()).isEqualTo(422);
        assertThat(response.json().get("errors").get(0).get("field").asString()).isEqualTo("role");
        assertThat(response.json().get("errors").get(0).get("code").asString()).isEqualTo("UNKNOWN_FIELD");
        assertThat(api.get(STUDIO).status()).isEqualTo(401);
    }

    @Test
    void missingFieldsAreReportedAsValidationProblems() {
        ApiClient api = client();
        api.refreshCsrf();

        ApiClient.Response response = api.post("/api/v1/auth/login", Map.of("identifier", "okur@example.test"));

        assertThat(response.status()).isEqualTo(422);
        assertThat(response.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(response.json().get("errors").get(0).get("field").asString()).isEqualTo("password");
    }

    @Test
    void unlistedRoutesAreDeniedAndApiResponsesAreNotCachedOrIndexed() {
        ApiClient.Response response = client().get("/api/v1/unlisted");

        assertThat(response.status()).isEqualTo(401);
        assertThat(response.header("Cache-Control")).contains("no-store");
        assertThat(response.header("X-Robots-Tag")).isEqualTo("noindex");
        assertThat(response.json().toString()).doesNotContain("Exception").doesNotContain("trace");
    }

    @Test
    void healthEndpointIsAvailable() {
        ApiClient.Response health = client().get("/actuator/health");

        assertThat(health.status()).isEqualTo(200);
        assertThat(health.json().get("status").asString()).isEqualTo("UP");
    }
}
