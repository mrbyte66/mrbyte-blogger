package com.satir.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.satir.support.ApiClient;
import com.satir.support.ApiClient.Response;
import com.satir.support.IntegrationTest;

/** Membership V1 (slice 5): registration, verification, recovery, re-auth, sessions and deletion. */
class MembershipIntegrationTest extends IntegrationTest {

    private static final String EMAIL = "yeni.okur@example.test";
    private static final String PASSWORD = "uzun-bir-parola-1";

    private Response register(ApiClient api, String email, String password) {
        api.refreshCsrf();
        return api.post("/api/v1/auth/register",
                Map.of("name", "Yeni Okur", "email", email, "password", password, "passwordConfirmation", password));
    }

    private ApiClient verifiedMember() {
        ApiClient api = client();
        register(api, EMAIL, PASSWORD);
        api.post("/api/v1/auth/verification/confirm", Map.of("token", mail.lastToken(EMAIL).orElseThrow()));
        api.login(EMAIL, PASSWORD);
        api.refreshCsrf();
        return api;
    }

    private void reauth(ApiClient api, String password) {
        assertThat(api.post("/api/v1/auth/reauthenticate", Map.of("password", password)).status()).isEqualTo(200);
    }

    @Test
    void registrationNeedsEmailVerificationBeforePrivateFeatures() {
        ApiClient api = client();
        Response registered = register(api, EMAIL, PASSWORD);
        assertThat(registered.status()).isEqualTo(202);
        String token = mail.lastToken(EMAIL).orElseThrow();
        assertThat(jdbc.sql("SELECT count(*) FROM action_token WHERE token_hash = :t").param("t", token).query(Long.class).single())
                .as("plain token is never stored").isZero();

        api.login(EMAIL, PASSWORD);
        api.refreshCsrf();
        assertThat(api.get("/api/v1/me").code()).isEqualTo("EMAIL_VERIFICATION_REQUIRED");

        assertThat(api.post("/api/v1/auth/verification/confirm", Map.of("token", token)).status()).isEqualTo(204);
        assertThat(api.post("/api/v1/auth/verification/confirm", Map.of("token", token)).code()).as("single use").isEqualTo("INVALID_TOKEN");
        Response me = api.get("/api/v1/me");
        assertThat(me.status()).isEqualTo(200);
        assertThat(me.text("role")).isEqualTo("member");
        assertThat(api.get("/api/v1/studio/articles").status()).as("membership grants no Studio").isEqualTo(403);
    }

    @Test
    void registrationDoesNotRevealExistingAccounts() {
        createMember("var@example.test", "var-olan-parola-1", true);
        Response existing = register(client(), "var@example.test", PASSWORD);
        Response fresh = register(client(), "yok@example.test", PASSWORD);

        assertThat(existing.status()).isEqualTo(202).isEqualTo(fresh.status());
        assertThat(existing.json()).isEqualTo(fresh.json());
        assertThat(jdbc.sql("SELECT count(*) FROM app_user WHERE email_normalized = 'var@example.test'").query(Long.class).single()).isEqualTo(1);
        assertThat(mail.to("var@example.test").getFirst().getText()).contains("zaten bir hesabın var");
    }

    @Test
    void registrationValidatesAndRejectsRoleInjection() {
        ApiClient api = client();
        api.refreshCsrf();
        Response mismatch = api.post("/api/v1/auth/register",
                Map.of("name", "A", "email", EMAIL, "password", PASSWORD, "passwordConfirmation", PASSWORD + "x"));
        assertThat(mismatch.json().get("errors").get(0).get("code").asString()).isEqualTo("MISMATCH");
        Response role = api.post("/api/v1/auth/register",
                Map.of("name", "A", "email", EMAIL, "password", PASSWORD, "passwordConfirmation", PASSWORD, "role", "owner"));
        assertThat(role.status()).isEqualTo(422);
        assertThat(jdbc.sql("SELECT count(*) FROM app_user").query(Long.class).single()).isZero();
    }

    @Test
    void passwordResetEndsEverySession() {
        ApiClient first = verifiedMember();
        ApiClient other = client();
        other.login(EMAIL, PASSWORD);
        assertThat(other.get("/api/v1/me").status()).isEqualTo(200);

        ApiClient anonymous = client();
        anonymous.refreshCsrf();
        assertThat(anonymous.post("/api/v1/auth/password/forgot", Map.of("email", EMAIL)).status()).isEqualTo(202);
        assertThat(anonymous.post("/api/v1/auth/password/forgot", Map.of("email", "kimse@example.test")).status()).isEqualTo(202);
        String token = mail.lastToken(EMAIL).orElseThrow();

        Response reset = anonymous.post("/api/v1/auth/password/reset",
                Map.of("token", token, "password", "yepyeni-parola-22", "passwordConfirmation", "yepyeni-parola-22"));
        assertThat(reset.status()).isEqualTo(204);
        assertThat(first.get("/api/v1/me").status()).isEqualTo(401);
        assertThat(other.get("/api/v1/me").status()).isEqualTo(401);
        assertThat(client().login(EMAIL, PASSWORD).status()).isEqualTo(401);
        assertThat(client().login(EMAIL, "yepyeni-parola-22").status()).isEqualTo(200);
    }

    @Test
    void resetLinksExpire() {
        verifiedMember();
        ApiClient anonymous = client();
        anonymous.refreshCsrf();
        anonymous.post("/api/v1/auth/password/forgot", Map.of("email", EMAIL));
        String token = mail.lastToken(EMAIL).orElseThrow();
        clock.advance(Duration.ofMinutes(31));
        Response reset = anonymous.post("/api/v1/auth/password/reset",
                Map.of("token", token, "password", "yepyeni-parola-22", "passwordConfirmation", "yepyeni-parola-22"));
        assertThat(reset.code()).isEqualTo("INVALID_TOKEN");
    }

    @Test
    void sensitiveChangesRequireRecentReauthentication() {
        ApiClient api = verifiedMember();
        Map<String, String> body = Map.of("password", "baska-parola-333", "passwordConfirmation", "baska-parola-333");
        assertThat(api.put("/api/v1/me/password", body, Map.of()).code()).isEqualTo("REAUTH_REQUIRED");
        assertThat(api.post("/api/v1/auth/reauthenticate", Map.of("password", "yanlis-parola")).status()).isEqualTo(401);

        reauth(api, PASSWORD);
        clock.advance(Duration.ofMinutes(6));
        assertThat(api.put("/api/v1/me/password", body, Map.of()).code()).as("re-auth window is 5 minutes").isEqualTo("REAUTH_REQUIRED");

        reauth(api, PASSWORD);
        assertThat(api.put("/api/v1/me/password", body, Map.of()).status()).isEqualTo(204);
        assertThat(api.get("/api/v1/me").status()).as("password change signs out").isEqualTo(401);
        assertThat(client().login(EMAIL, "baska-parola-333").status()).isEqualTo(200);
    }

    @Test
    void profileAndPreferencesUseOptimisticVersions() {
        ApiClient api = verifiedMember();
        Response me = api.get("/api/v1/me");
        Response updated = api.patch("/api/v1/me", Map.of("name", "Yeni Ad", "avatar", "portrait-12"), Map.of("If-Match", me.etag()));
        assertThat(updated.text("name")).isEqualTo("Yeni Ad");
        assertThat(updated.text("avatar")).isEqualTo("portrait-12");
        assertThat(api.patch("/api/v1/me", Map.of("name", "Eski"), Map.of("If-Match", me.etag())).status()).isEqualTo(412);
        assertThat(api.patch("/api/v1/me", Map.of("avatar", "../../etc"), Map.of("If-Match", updated.etag())).status()).isEqualTo(422);

        Response prefs = api.patch("/api/v1/me/preferences", Map.of("publicationEmail", false, "timeZone", "Europe/Berlin"),
                Map.of("If-Match", updated.etag()));
        assertThat(prefs.json().get("preferences").get("publicationEmail").asBoolean()).isFalse();
        assertThat(prefs.json().get("preferences").get("timeZone").asString()).isEqualTo("Europe/Berlin");
    }

    @Test
    void emailChangeIsConfirmedFromTheNewAddress() {
        ApiClient api = verifiedMember();
        reauth(api, PASSWORD);
        assertThat(api.post("/api/v1/me/email-change", Map.of("email", "yeni.adres@example.test")).status()).isEqualTo(202);
        assertThat(api.get("/api/v1/me").text("email")).as("unchanged until confirmed").isEqualTo(EMAIL);
        String token = mail.lastToken("yeni.adres@example.test").orElseThrow();

        ApiClient anonymous = client();
        anonymous.refreshCsrf();
        assertThat(anonymous.post("/api/v1/auth/email-change/confirm", Map.of("token", token)).status()).isEqualTo(204);
        assertThat(api.get("/api/v1/me").status()).as("all sessions ended").isEqualTo(401);
        assertThat(client().login("yeni.adres@example.test", PASSWORD).status()).isEqualTo(200);
        assertThat(client().login(EMAIL, PASSWORD).status()).isEqualTo(401);
    }

    @Test
    void membersManageOnlyTheirOwnSessions() {
        ApiClient laptop = verifiedMember();
        ApiClient phone = client();
        phone.login(EMAIL, PASSWORD);
        createMember("baska@example.test", "baska-parola-123", true);
        ApiClient stranger = client();
        stranger.login("baska@example.test", "baska-parola-123");
        stranger.refreshCsrf();

        Response list = laptop.get("/api/v1/me/sessions");
        assertThat(list.json().get("items")).hasSize(2);
        String phoneHandle = null;
        for (var item : list.json().get("items")) {
            assertThat(item.get("id").asString()).doesNotContain(laptop.sessionCookie().orElseThrow());
            if (!item.get("current").asBoolean()) {
                phoneHandle = item.get("id").asString();
            }
        }
        assertThat(stranger.delete("/api/v1/me/sessions/" + phoneHandle, null, Map.of()).status()).isEqualTo(404);
        assertThat(phone.get("/api/v1/me").status()).isEqualTo(200);

        assertThat(laptop.delete("/api/v1/me/sessions/" + phoneHandle, null, Map.of()).status()).isEqualTo(204);
        assertThat(phone.get("/api/v1/me").status()).isEqualTo(401);
        assertThat(laptop.get("/api/v1/me").status()).isEqualTo(200);
    }

    @Test
    void accountDeletionRemovesPersonalDataButOwnerCannotSelfDelete() {
        ApiClient api = verifiedMember();
        reauth(api, PASSWORD);
        assertThat(api.delete("/api/v1/me", Map.of("confirmation", "evet"), Map.of()).status()).isEqualTo(422);
        assertThat(api.delete("/api/v1/me", Map.of("confirmation", "DELETE"), Map.of()).status()).isEqualTo(204);

        var row = jdbc.sql("SELECT status, email, display_name FROM app_user").query().singleRow();
        assertThat(row.get("status")).isEqualTo("DELETED");
        assertThat(row.get("email")).isNull();
        assertThat(row.get("display_name")).isNull();
        assertThat(jdbc.sql("SELECT count(*) FROM password_credential").query(Long.class).single()).isZero();
        assertThat(client().login(EMAIL, PASSWORD).status()).isEqualTo(401);
        assertThat(register(client(), EMAIL, PASSWORD).status()).as("address can register again").isEqualTo(202);

        createOwner();
        ApiClient owner = ownerClient();
        reauth(owner, OWNER_PASSWORD);
        assertThat(owner.delete("/api/v1/me", Map.of("confirmation", "DELETE"), Map.of()).code())
                .isEqualTo("OWNER_DELETE_REQUIRES_MIGRATION");
    }

    @Test
    void accountMailRequestsAreRateLimited() {
        ApiClient api = client();
        api.refreshCsrf();
        for (int i = 0; i < 3; i++) {
            assertThat(api.post("/api/v1/auth/password/forgot", Map.of("email", "spam@example.test")).status()).isEqualTo(202);
        }
        Response limited = api.post("/api/v1/auth/password/forgot", Map.of("email", "spam@example.test"));
        assertThat(limited.status()).isEqualTo(429);
        assertThat(limited.header("Retry-After")).isNotNull();
    }

    @Test
    void googleIsReportedUnavailableWithoutConfiguration() {
        ApiClient api = client();
        api.refreshCsrf();
        Response start = api.post("/api/v1/auth/google/start", Map.of("returnTo", "/giris"));
        assertThat(start.status()).isEqualTo(503);
        assertThat(start.code()).isEqualTo("GOOGLE_NOT_CONFIGURED");
    }
}
