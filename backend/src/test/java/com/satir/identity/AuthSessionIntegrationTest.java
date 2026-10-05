package com.satir.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.IntegrationTest;

/** Login, session, CSRF and logout behaviour through real HTTP, cookies and PostgreSQL sessions. */
class AuthSessionIntegrationTest extends IntegrationTest {

    @Test
    void ownerLoginRotatesSessionAndCsrfAndReturnsOwnProfile() {
        UUID ownerId = createOwner();
        ApiClient api = client();
        String anonymousCsrf = api.refreshCsrf();
        String anonymousSession = api.sessionCookie().orElseThrow();

        ApiClient.Response login = api.login("  sahip@EXAMPLE.test ", OWNER_PASSWORD);

        assertThat(login.status()).isEqualTo(200);
        assertThat(login.json().get("id").asString()).isEqualTo(ownerId.toString());
        assertThat(login.json().get("role").asString()).isEqualTo("owner");
        assertThat(login.json().get("verified").asBoolean()).isTrue();
        assertThat(login.json().get("preferences").get("publicationEmail").asBoolean()).isTrue();
        assertThat(login.json().has("password")).isFalse();
        assertThat(api.sessionCookie().orElseThrow()).as("session fixation protection").isNotEqualTo(anonymousSession);

        // The pre-login CSRF token is no longer valid.
        api.useCsrfToken(anonymousCsrf);
        assertThat(api.post("/api/v1/auth/logout", null).code()).isEqualTo("CSRF_INVALID");

        api.refreshCsrf();
        ApiClient.Response session = api.get("/api/v1/auth/session");
        assertThat(session.json().get("authenticated").asBoolean()).isTrue();
        assertThat(session.json().get("profile").get("email").asString()).isEqualTo(OWNER_EMAIL);
        assertThat(session.json().get("expiresAt").asString()).isNotBlank();
        assertThat(api.get("/api/v1/me").status()).isEqualTo(200);
        assertThat(auditCount("LOGIN", "SUCCESS")).isEqualTo(1);
    }

    @Test
    void ownerCanSignInWithCaseInsensitiveUsername() {
        createOwner();

        assertThat(client().login("MRBYTE", OWNER_PASSWORD).status()).isEqualTo(200);
    }

    @Test
    void unsafeRequestsWithoutCsrfTokenAreRejected() {
        createOwner();
        ApiClient api = client();
        api.refreshCsrf();

        ApiClient.Response response = api.post("/api/v1/auth/login",
                Map.of("identifier", OWNER_EMAIL, "password", OWNER_PASSWORD), false);

        assertThat(response.status()).isEqualTo(403);
        assertThat(response.code()).isEqualTo("CSRF_INVALID");
        assertThat(response.header("Content-Type")).startsWith("application/problem+json");
    }

    @Test
    void wrongPasswordAndUnknownAccountFailIdentically() {
        createOwner();

        ApiClient.Response wrongPassword = client().login(OWNER_EMAIL, "yanlis-parola-123");
        ApiClient.Response unknownAccount = client().login("kimse@example.test", "yanlis-parola-123");

        assertThat(wrongPassword.status()).isEqualTo(401);
        assertThat(unknownAccount.status()).isEqualTo(401);
        assertThat(wrongPassword.code()).isEqualTo("INVALID_CREDENTIALS").isEqualTo(unknownAccount.code());
        assertThat(wrongPassword.json().get("title")).isEqualTo(unknownAccount.json().get("title"));
        assertThat(auditCount("LOGIN", "FAILURE")).isEqualTo(2);
    }

    @Test
    void repeatedFailuresAreRateLimitedEvenForTheCorrectPassword() {
        createOwner();
        ApiClient api = client();
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThat(api.login(OWNER_EMAIL, "yanlis-parola-123").status()).isEqualTo(401);
        }

        ApiClient.Response blocked = api.login(OWNER_EMAIL, OWNER_PASSWORD);

        assertThat(blocked.status()).isEqualTo(429);
        assertThat(blocked.code()).isEqualTo("RATE_LIMITED");
        assertThat(Long.parseLong(blocked.header("Retry-After"))).isBetween(1L, 900L);
        assertThat(jdbc.sql("SELECT count(*) FROM auth_rate_bucket WHERE key_hash LIKE '%@%'").query(Long.class).single())
                .as("identifiers are stored only as HMACs").isZero();

        clock.advance(Duration.ofMinutes(16));
        assertThat(api.login(OWNER_EMAIL, OWNER_PASSWORD).status()).isEqualTo(200);
    }

    @Test
    void logoutDeletesTheServerSessionSoTheOldCookieIsUseless() {
        createOwner();
        ApiClient api = client();
        api.login(OWNER_EMAIL, OWNER_PASSWORD);
        String signedInCookie = api.sessionCookie().orElseThrow();
        api.refreshCsrf();

        assertThat(api.post("/api/v1/auth/logout", null).status()).isEqualTo(204);

        assertThat(sessionRows()).isZero();
        ApiClient replay = client();
        replay.setSessionCookie(signedInCookie);
        assertThat(replay.get("/api/v1/me").status()).isEqualTo(401);
        assertThat(replay.get("/api/v1/auth/session").json().get("authenticated").asBoolean()).isFalse();
    }

    @Test
    void ownerSessionEndsAtItsAbsoluteLifetime() {
        createOwner();
        ApiClient api = client();
        api.login(OWNER_EMAIL, OWNER_PASSWORD);
        assertThat(api.get("/api/v1/me").status()).isEqualTo(200);

        clock.advance(Duration.ofHours(8).plusMinutes(1));

        assertThat(api.get("/api/v1/me").status()).isEqualTo(401);
        assertThat(api.get("/api/v1/auth/session").json().get("authenticated").asBoolean()).isFalse();
    }

    @Test
    void deletingAnAccountEndsItsExistingSessions() {
        UUID memberId = createMember("okur@example.test", "okur-parolasi-123", true);
        ApiClient api = client();
        api.login("okur@example.test", "okur-parolasi-123");
        assertThat(api.get("/api/v1/me").status()).isEqualTo(200);

        jdbc.sql("UPDATE app_user SET status = 'DELETED', email = NULL, email_normalized = NULL, display_name = NULL WHERE id = :id")
                .param("id", memberId).update();

        assertThat(api.get("/api/v1/me").status()).isEqualTo(401);
    }

    @Test
    void sessionCookieIsHttpOnlyAndSameSiteLax() {
        createOwner();
        ApiClient api = client();
        api.refreshCsrf();

        ApiClient.Response login = api.post("/api/v1/auth/login", Map.of("identifier", OWNER_EMAIL, "password", OWNER_PASSWORD));

        String setCookie = login.headers().allValues("Set-Cookie").stream()
                .filter(value -> value.startsWith(ApiClient.SESSION_COOKIE + "="))
                .findFirst().orElseThrow();
        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Lax").contains("Path=/");
    }

    @Test
    void sessionEndpointReportsAnonymousCallers() {
        ApiClient.Response response = client().get("/api/v1/auth/session");

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.json().get("authenticated").asBoolean()).isFalse();
        assertThat(response.json().has("profile")).isFalse();
    }

    @Test
    void renewRequiresASignedInSession() {
        ApiClient api = client();
        api.refreshCsrf();

        assertThat(api.post("/api/v1/auth/session/renew", null).status()).isEqualTo(401);
    }

    private long sessionRows() {
        return jdbc.sql("SELECT count(*) FROM spring_session WHERE principal_name IS NOT NULL").query(Long.class).single();
    }

    private long auditCount(String action, String outcome) {
        return jdbc.sql("SELECT count(*) FROM audit_event WHERE action = :action AND outcome = :outcome")
                .param("action", action).param("outcome", outcome).query(Long.class).single();
    }
}
