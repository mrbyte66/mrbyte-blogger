package com.satir;

import com.satir.identity.application.AccountService;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.context.annotation.Import(IdentityIntegrationTest.DeliveryTestConfiguration.class)
class IdentityIntegrationTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        // No H2 fallback and no silently skipped database tests.
        String url=System.getenv("SATIR_TEST_DB_URL");
        if(url==null || !url.startsWith("jdbc:postgresql:")) throw new IllegalStateException("Run scripts/test-postgres.sh or provide a disposable SATIR_TEST_DB_URL");
        r.add("spring.datasource.url",() -> url);
        r.add("spring.datasource.username",() -> System.getenv("SATIR_TEST_DB_USER"));
        r.add("spring.datasource.password",() -> System.getenv("SATIR_TEST_DB_PASSWORD"));
        r.add("GOOGLE_CLIENT_ID",() -> "test-client-id");
        r.add("GOOGLE_CLIENT_SECRET",() -> "test-client-secret");
        r.add("satir.media-root",() -> temporaryRoot()+"/media");
        r.add("satir.archive-root",() -> temporaryRoot()+"/archives");
        r.add("satir.migration-mode",() -> "migrate");
        r.add("satir.workers-enabled",() -> false);
        r.add("TOKEN_ENCRYPTION_KEY",() -> "dGVzdC1vbmx5LWtleS0zMi1ieXRlcy0wMDAwMDAwMDA=");
        r.add("satir.rate-secret",() -> "disposable-only-test-hmac-secret-32-chars");
        r.add("server.servlet.session.cookie.secure",() -> false);
        r.add("server.servlet.session.cookie.name",() -> "satir-session-dev");
    }
    private static String temporaryRoot(){try{return java.nio.file.Path.of(System.getProperty("java.io.tmpdir")).toRealPath().resolve("satir-tests-"+ProcessHandle.current().pid()).toString();}catch(java.io.IOException e){throw new IllegalStateException(e);}}
    @Autowired com.satir.site.application.ArchiveJobs archives;
    @Autowired com.satir.site.application.ArchiveCodec archiveCodec;
    @Autowired @org.springframework.beans.factory.annotation.Qualifier("requestMappingHandlerMapping") org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping mappings;
    @Autowired MockMvc http;
    @Autowired AccountService accounts;
    @Autowired JdbcClient jdbc;
    @Autowired PasswordEncoder encoder;
    @Autowired com.satir.identity.application.GoogleAccounts google;
    @Autowired org.springframework.session.jdbc.JdbcIndexedSessionRepository sessions;
    @Autowired com.satir.platform.SecretCipher cipher;
    @Autowired com.satir.delivery.application.OutboxWorker worker;
    @Autowired CapturingMail mail;
    @Autowired CapturingCover coverProvider;
    @Autowired com.satir.media.application.CoverJobs coverJobs;
    @Autowired com.satir.media.infrastructure.CoverRetention coverRetention;
    @Autowired com.satir.editorial.application.PublicationScheduler scheduler;
    @org.springframework.boot.test.context.TestConfiguration
    static class DeliveryTestConfiguration {
        @org.springframework.context.annotation.Bean @org.springframework.context.annotation.Primary CapturingCover testCover(){return new CapturingCover();}
        @org.springframework.context.annotation.Bean @org.springframework.context.annotation.Primary CapturingMail testMail(){return new CapturingMail();}
    }
    static class CapturingCover implements com.satir.media.application.CoverProvider {
        boolean enabled=false; java.util.List<Photo> photos=java.util.List.of();
        public boolean configured(){return enabled;}
        public java.util.List<Photo> search(String query){return photos;}
    }
    static class CapturingMail implements com.satir.delivery.application.MailGateway {
        boolean enabled=true,fail=false; final java.util.List<String> delivered=new java.util.ArrayList<>();final java.util.List<String> recipients=new java.util.ArrayList<>();
        public boolean configured(){return enabled;}
        public void send(String recipient,String subject,String text,String deliveryId){if(fail)throw new IllegalStateException("test failure");delivered.add(text);recipients.add(recipient);}
    }
    @BeforeEach void clear() { coverProvider.enabled=false;coverProvider.photos=java.util.List.of(); mail.enabled=true;mail.fail=false;mail.delivered.clear();mail.recipients.clear(); jdbc.sql("truncate spring_session, app_user, auth_rate_bucket, outbox_job, category, idempotency_record, anonymous_actor, engagement_lock, account_deletion_journal cascade").update();jdbc.sql("update theme_workspace set draft_revision_id='00000000-0000-0000-0000-000000000001',applied_revision_id='00000000-0000-0000-0000-000000000001',version=0").update();jdbc.sql("delete from theme_revision where id<>'00000000-0000-0000-0000-000000000001'").update();jdbc.sql("update site_settings set indexing_enabled=false,version=0").update(); }
    @Test void openApiCoversEveryImplementedControllerOperation() throws Exception {
        var spec=new tools.jackson.databind.ObjectMapper().readTree(java.nio.file.Files.readString(java.nio.file.Path.of("docs/openapi.yaml")));
        var missing=new java.util.ArrayList<String>();
        mappings.getHandlerMethods().forEach((mapping,handler)->{
            if(!handler.getBeanType().getPackageName().startsWith("com.satir."))return;
            for(String path:mapping.getPatternValues()) for(var method:mapping.getMethodsCondition().getMethods()) {
                if(!spec.path("paths").path(path).has(method.name().toLowerCase(java.util.Locale.ROOT))) missing.add(method+" "+path);
            }
        });
        assertThat(missing).isEmpty();
    }
    @Test void foreignOriginIsRejectedEvenWithValidCsrf() throws Exception {
        http.perform(post("/api/v1/auth/login").with(csrf()).header("Origin","https://untrusted.invalid").contentType("application/json").content("{\"identifier\":\"nobody\",\"password\":\"wrong\"}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ORIGIN_REJECTED"));
    }
    @Test void csrfRequiredEvenForLogin() throws Exception {
        http.perform(post("/api/v1/auth/login").contentType("application/json").content("{\"identifier\":\"nobody\",\"password\":\"wrong\"}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }
    @Test void guestAndMemberCannotReachStudio() throws Exception {
        http.perform(get("/api/v1/studio/articles")).andExpect(status().isUnauthorized());
        var id=UUID.randomUUID(); createMember(id,"ACTIVE");
        var cookie=login(id+"@test.invalid");
        org.springframework.session.Session stored=sessions.findById(new String(java.util.Base64.getDecoder().decode(cookie.getValue())));
        var context=org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(id.toString(),null,java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_OWNER"))));
        stored.setAttribute("SPRING_SECURITY_CONTEXT",context); ((org.springframework.session.SessionRepository)sessions).save(stored);
        http.perform(get("/api/v1/studio/articles").cookie(cookie))
            .andExpect(status().isForbidden()); // Forged persisted authority is reconstructed from PostgreSQL.
    }
    @Test void oldPrototypeCookieDoesNotAuthorize() throws Exception {
        http.perform(get("/api/v1/studio/articles").cookie(new jakarta.servlet.http.Cookie("satir-studio","signed-prototype-cookie"))).andExpect(status().isUnauthorized());
    }
    @Test void loginVerifiesHashAndUsesServerRole() throws Exception {
        var owner=accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");
        var result=http.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"identifier\":\"testowner\",\"password\":\"test-only-long-password\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("owner")).andReturn();
        assertThat(jdbc.sql("select password_hash from password_credential where user_id=?").param(owner.id()).query(String.class).single()).startsWith("$argon2id$");
        var cookie=result.getResponse().getCookie("satir-session-dev");
        assertThat(cookie).isNotNull(); assertThat(cookie.isHttpOnly()).isTrue();
        assertThat((Object)((org.springframework.session.Session)sessions.findById(new String(java.util.Base64.getDecoder().decode(cookie.getValue())))).getAttribute("authenticatedAt")).isInstanceOf(Long.class);
        http.perform(get("/api/v1/auth/session").cookie(cookie))
            .andExpect(status().isOk()).andExpect(jsonPath("$.authenticated").value(true));
        http.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"identifier\":\"testowner\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
    @Test void missingUserAndAbsoluteExpiredSessionAreRejected() throws Exception {
        http.perform(get("/api/v1/auth/session").with(user(UUID.randomUUID().toString())).sessionAttr("authenticatedAt",System.currentTimeMillis())).andExpect(jsonPath("$.authenticated").value(false));
        var owner=accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");
        var cookie=login("testowner");
        org.springframework.session.Session stored=sessions.findById(new String(java.util.Base64.getDecoder().decode(cookie.getValue())));
        stored.setAttribute("authenticatedAt",System.currentTimeMillis()-28800001L); ((org.springframework.session.SessionRepository)sessions).save(stored);
        http.perform(get("/api/v1/studio/articles").cookie(cookie)).andExpect(status().isUnauthorized());
    }
    @Test void duplicateOwnerIsRejectedByDomainAndDatabase() {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");
        assertThatThrownBy(() -> accounts.bootstrap("otherowner","second@test.invalid","Owner","test-only-long-password")).hasMessage("OWNER_ALREADY_EXISTS");
        assertThatThrownBy(() -> jdbc.sql("insert into app_user(id,name,email,role,status,created_at) values (?, 'x','third@test.invalid','OWNER','ACTIVE',now())").param(UUID.randomUUID()).update()).isInstanceOf(org.springframework.dao.DuplicateKeyException.class);
    }
    @Test void loginRateLimitSurvivesFailedRequests() throws Exception {
        for(int i=0;i<5;i++) http.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"identifier\":\"missing@test.invalid\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
        http.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"identifier\":\"missing@test.invalid\",\"password\":\"wrong\"}"))
            .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        assertThat(jdbc.sql("select key_hash from auth_rate_bucket").query(String.class).list()).allMatch(s -> s.matches("[0-9a-f]{64}"));
    }
    @Test void passwordLimitsAndNoStoreResponses() throws Exception {
        assertThatThrownBy(() -> accounts.bootstrap("testowner","owner@test.invalid","Owner","short")).hasMessage("VALIDATION_FAILED");
        http.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andExpect(jsonPath("$.token").isString()).andExpect(header().string("Cache-Control","private, no-store"));
    }
    @Test void registrationCannotAssignRolesAndDuplicateIsGeneric() throws Exception {
        String body="{\"name\":\"Reader\",\"email\":\"reader@test.invalid\",\"password\":\"test-only-long-password\",\"passwordConfirmation\":\"test-only-long-password\"}";
        http.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content(body.substring(0,body.length()-1)+",\"role\":\"OWNER\"}")).andExpect(status().isUnprocessableEntity());
        for(int i=0;i<2;i++)http.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content(body)).andExpect(status().isAccepted()).andExpect(jsonPath("$.message").value("E-postanı kontrol et"));
        assertThat(jdbc.sql("select count(*) from app_user").query(Integer.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("select role from app_user").query(String.class).single()).isEqualTo("MEMBER");
        assertThat(jdbc.sql("select count(*) from outbox_job").query(Integer.class).single()).isEqualTo(1);
    }
    @Test void unavailableMailDoesNotCreateFakeAccountOrSuccess() throws Exception {
        mail.enabled=false;
        http.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content("{\"name\":\"Reader\",\"email\":\"reader@test.invalid\",\"password\":\"test-only-long-password\",\"passwordConfirmation\":\"test-only-long-password\"}"))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("MAIL_NOT_CONFIGURED"));
        assertThat(jdbc.sql("select count(*) from app_user").query(Integer.class).single()).isZero();
    }
    @Test void verificationIsExplicitSingleUseAndPendingIsRestricted() throws Exception {
        var id=UUID.randomUUID();createMember(id,"PENDING");var cookie=login(id+"@test.invalid");
        http.perform(get("/api/v1/me").cookie(cookie)).andExpect(status().isForbidden());
        http.perform(post("/api/v1/auth/verification/resend").with(csrf()).contentType("application/json").content("{\"email\":\""+id+"@test.invalid\"}")).andExpect(status().isAccepted());
        String token=rawToken();
        http.perform(get("/api/v1/auth/verification/confirm").param("token",token)).andExpect(status().isMethodNotAllowed());
        http.perform(post("/api/v1/auth/verification/confirm").with(csrf()).contentType("application/json").content("{\"token\":\""+token+"\"}")).andExpect(status().isNoContent());
        http.perform(get("/api/v1/me").cookie(cookie)).andExpect(status().isOk());
        http.perform(post("/api/v1/auth/verification/confirm").with(csrf()).contentType("application/json").content("{\"token\":\""+token+"\"}")).andExpect(status().isUnprocessableEntity());
    }
    @Test void resetRevokesSessionsAndRejectsExpiredToken() throws Exception {
        var id=UUID.randomUUID();createMember(id,"ACTIVE");var cookie=login(id+"@test.invalid");
        http.perform(post("/api/v1/auth/password/forgot").with(csrf()).contentType("application/json").content("{\"email\":\""+id+"@test.invalid\"}")).andExpect(status().isAccepted());
        String token=rawToken();
        jdbc.sql("update action_token set expires_at=now()-interval '1 minute'").update();
        String reset="{\"token\":\""+token+"\",\"password\":\"a-different-long-password\",\"passwordConfirmation\":\"a-different-long-password\"}";
        http.perform(post("/api/v1/auth/password/reset").with(csrf()).contentType("application/json").content(reset)).andExpect(status().isUnprocessableEntity());
        jdbc.sql("update action_token set expires_at=now()+interval '1 minute'").update();
        http.perform(post("/api/v1/auth/password/reset").with(csrf()).contentType("application/json").content(reset)).andExpect(status().isNoContent());
        http.perform(get("/api/v1/auth/session").cookie(cookie)).andExpect(jsonPath("$.authenticated").value(false));
        assertThat(encoder.matches("a-different-long-password",jdbc.sql("select password_hash from password_credential where user_id=?").param(id).query(String.class).single())).isTrue();
    }
    @Test void outboxRetriesAndDoesNotResendCompletedJobs() throws Exception {
        var id=UUID.randomUUID();createMember(id,"PENDING");
        http.perform(post("/api/v1/auth/verification/resend").with(csrf()).contentType("application/json").content("{\"email\":\""+id+"@test.invalid\"}")).andExpect(status().isAccepted());
        String token=rawToken();
        assertThat(jdbc.sql("select token_hash from action_token").query(String.class).single()).isNotEqualTo(token);
        mail.fail=true;worker.runOne();assertThat(jdbc.sql("select state from outbox_job").query(String.class).single()).isEqualTo("PENDING");
        mail.fail=false;jdbc.sql("update outbox_job set available_at=now()").update();worker.runOne();worker.runOne();
        assertThat(mail.delivered).hasSize(1);assertThat(mail.delivered.getFirst()).contains("#token="+token);
        assertThat(jdbc.sql("select state from outbox_job").query(String.class).single()).isEqualTo("SENT");
    }
    @Test void profilesUseOptimisticVersionAndSessionsArePrivate() throws Exception {
        var first=UUID.randomUUID();var second=UUID.randomUUID();createMember(first,"ACTIVE");createMember(second,"ACTIVE");
        var cookie=login(first+"@test.invalid");
        http.perform(patch("/api/v1/me").cookie(cookie).with(csrf()).contentType("application/json").content("{\"avatar\":\"portrait-54\"}")).andExpect(status().isPreconditionRequired());
        http.perform(patch("/api/v1/me").cookie(cookie).with(csrf()).header("If-Match","\"0\"").contentType("application/json").content("{\"avatar\":\"portrait-54\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        http.perform(patch("/api/v1/me").cookie(cookie).with(csrf()).header("If-Match","\"0\"").contentType("application/json").content("{\"name\":\"Overwrite\"}")).andExpect(status().isPreconditionFailed());
        var other=login(second+"@test.invalid");
        UUID managementId=jdbc.sql("select primary_id from spring_session where principal_name=?").param(second.toString()).query(String.class).list().stream().map(UUID::fromString).findFirst().orElseThrow();
        http.perform(delete("/api/v1/me/sessions/"+managementId).cookie(cookie).with(csrf())).andExpect(status().isNotFound());
        http.perform(get("/api/v1/auth/session").cookie(other)).andExpect(jsonPath("$.authenticated").value(true));
        http.perform(post("/api/v1/me/sessions/revoke-others").cookie(cookie).with(csrf())).andExpect(status().isForbidden());
    }
    @Test void draftsPrivateAliasesAndPublicationAreServerControlled() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var cookie=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        String body=articleBody(category,"initial","public");String key=UUID.randomUUID().toString();
        var created=http.perform(post("/api/v1/studio/articles").cookie(cookie).with(csrf()).header("Idempotency-Key",key).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn();
        var json=new tools.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString());String id=json.get("id").asText();
        http.perform(post("/api/v1/studio/articles").cookie(cookie).with(csrf()).header("Idempotency-Key",key).contentType("application/json").content(body)).andExpect(jsonPath("$.id").value(id));
        http.perform(post("/api/v1/studio/articles").cookie(cookie).with(csrf()).header("Idempotency-Key",key).contentType("application/json").content(body.replace("Secret title","Different title"))).andExpect(status().isConflict());
        http.perform(get("/api/v1/articles/by-slug/initial")).andExpect(status().isNotFound()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Secret title"))));
        articleAction(cookie,id,0,"publish",200);
        http.perform(get("/api/v1/articles/by-slug/initial")).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Secret title"));
        http.perform(put("/api/v1/studio/articles/"+id).cookie(cookie).with(csrf()).header("If-Match","\"1\"").contentType("application/json").content(body.replace("initial","new-slug").replace(",\"visibility\":\"public\"",""))).andExpect(status().isOk());
        http.perform(get("/api/v1/articles/by-slug/initial")).andExpect(jsonPath("$.canonicalPath").value("/yazilar/new-slug"));
        articleAction(cookie,id,2,"make-private",200);
        for(String slug:java.util.List.of("initial","new-slug"))http.perform(get("/api/v1/articles/by-slug/"+slug)).andExpect(status().isNotFound());
        http.perform(get("/api/v1/articles")).andExpect(jsonPath("$.totalElements").value(0));
        articleAction(cookie,id,3,"publish",409);
        worker.runOne();assertThat(jdbc.sql("select state from outbox_job").query(String.class).single()).isEqualTo("SKIPPED");
    }
    @Test void publicationJobsSearchRetryAndPreferenceAreOwnerControlled() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password"); var owner=login("testowner");
        UUID category=UUID.randomUUID(); jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var created=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"notification-test","public"))).andExpect(status().isCreated()).andReturn();
        String id=new tools.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString()).get("id").asText(); articleAction(owner,id,0,"publish",200);
        UUID job=jdbc.sql("select id from outbox_job where type='PUBLICATION'").query(UUID.class).single();
        http.perform(get("/api/v1/studio/publication-jobs").cookie(owner).param("q","Secret title")).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].articleTitle").value("Secret title"));
        http.perform(get("/api/v1/studio/publication-jobs").cookie(owner).param("q","absent")).andExpect(jsonPath("$.totalElements").value(0));
        http.perform(get("/api/v1/studio/publication-jobs")).andExpect(status().isUnauthorized());
        var member=UUID.randomUUID(); createMember(member,"ACTIVE"); http.perform(get("/api/v1/studio/publication-jobs").cookie(login(member+"@test.invalid"))).andExpect(status().isForbidden());
        http.perform(post("/api/v1/studio/publication-jobs/"+job+"/retry").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID())).andExpect(status().isConflict());
        jdbc.sql("update outbox_job set state='FAILED',attempts=8 where id=?").param(job).update(); jdbc.sql("update user_preference set publication_email=false where user_id=(select id from app_user where role='OWNER')").update();
        var key=UUID.randomUUID(); for(int replay=0;replay<2;replay++) http.perform(post("/api/v1/studio/publication-jobs/"+job+"/retry").cookie(owner).with(csrf()).header("Idempotency-Key",key)).andExpect(status().isOk());
        assertThat(jdbc.sql("select state from outbox_job where id=?").param(job).query(String.class).single()).isEqualTo("SKIPPED"); worker.runOne(); assertThat(mail.delivered).isEmpty();
    }
    @Test void scheduledPublicationAndAccountPreferenceHaveOneEffect() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var cookie=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var created=http.perform(post("/api/v1/studio/articles").cookie(cookie).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"planned","public"))).andExpect(status().isCreated()).andReturn();
        var json=new tools.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString());String id=json.get("id").asText();
        String schedule="{\"action\":\"schedule\",\"scheduledAt\":\""+java.time.Instant.now().plusSeconds(3600)+"\",\"timeZone\":\"Europe/Istanbul\"}";
        http.perform(post("/api/v1/studio/articles/"+id+"/actions").cookie(cookie).with(csrf()).header("If-Match","\"0\"").header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(schedule)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("scheduled"));
        http.perform(get("/api/v1/articles/by-slug/planned")).andExpect(status().isNotFound());
        jdbc.sql("update article set scheduled_at=now()-interval '1 minute' where id=?").param(UUID.fromString(id)).update();scheduler.runDue();scheduler.runDue();
        assertThat(jdbc.sql("select publication_generation from article").query(Long.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("select count(*) from outbox_job").query(Integer.class).single()).isEqualTo(1);
        jdbc.sql("update user_preference set publication_email=false").update();worker.runOne();assertThat(mail.delivered).isEmpty();
        jdbc.sql("update user_preference set publication_email=true").update();worker.runOne();assertThat(mail.delivered).isEmpty();
        http.perform(get("/api/v1/articles/by-slug/planned")).andExpect(status().isOk());
    }
    @Test void ownerDateOrderingAndCategoryVisibilityMatchPublicRules() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var cookie=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        for(int day:java.util.List.of(5,1)){
            String body=articleBody(category,"date-"+day,"public").replace("2026-10-05","2026-10-0"+day);
            http.perform(post("/api/v1/studio/articles").cookie(cookie).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(body)).andExpect(status().isCreated());
        }
        http.perform(get("/api/v1/studio/articles").cookie(cookie).param("sort","date_asc")).andExpect(jsonPath("$.items[0].displayDate").value("2026-10-01"));
        http.perform(get("/api/v1/studio/articles").cookie(cookie).param("sort","date_desc")).andExpect(jsonPath("$.items[0].displayDate").value("2026-10-05"));
        http.perform(get("/api/v1/categories")).andExpect(jsonPath("$.items").isEmpty());
        http.perform(get("/api/v1/articles").param("size","51")).andExpect(status().isUnprocessableEntity());
    }
    @Test void seriesMembershipReorderAndPrivateNavigationAreAtomic() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var cookie=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var ids=new java.util.ArrayList<String>();
        for(String slug:java.util.List.of("chapter-one","chapter-secret","chapter-three")){
            var result=http.perform(post("/api/v1/studio/articles").cookie(cookie).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,slug,"public"))).andExpect(status().isCreated()).andReturn();
            ids.add(new tools.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).get("id").asText());
        }
        articleAction(cookie,ids.get(0),0,"publish",200);articleAction(cookie,ids.get(2),0,"publish",200);
        String body=seriesBody(ids,java.util.List.of(1L,0L,1L),"first-series");
        var created=http.perform(post("/api/v1/studio/series").cookie(cookie).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn();
        String id=new tools.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString()).get("id").asText();
        http.perform(get("/api/v1/series/by-slug/first-series")).andExpect(status().isNotFound());
        http.perform(post("/api/v1/studio/series/"+id+"/actions").cookie(cookie).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).header("If-Match","\"0\"").contentType("application/json").content("{\"action\":\"publish\"}")).andExpect(status().isOk());
        http.perform(get("/api/v1/series/"+id+"/chapters")).andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items[1].chapterNumber").value(2)).andExpect(jsonPath("$.items[1].id").value(ids.get(2))).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString(ids.get(1)))));
        http.perform(get("/api/v1/articles/by-slug/chapter-one")).andExpect(jsonPath("$.series.total").value(2)).andExpect(jsonPath("$.series.next.id").value(ids.get(2)));
        http.perform(post("/api/v1/studio/series").cookie(cookie).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(seriesBody(ids,java.util.List.of(2L,1L,2L),"second-series"))).andExpect(status().isConflict());
        assertThat(jdbc.sql("select count(*) from series").query(Integer.class).single()).isEqualTo(1);
        var reversed=java.util.List.of(ids.get(2),ids.get(1),ids.get(0));
        http.perform(put("/api/v1/studio/series/"+id).cookie(cookie).with(csrf()).header("If-Match","\"1\"").contentType("application/json").content(seriesBody(reversed,java.util.List.of(),"renamed-series"))).andExpect(status().isOk());
        http.perform(get("/api/v1/series/by-slug/first-series")).andExpect(jsonPath("$.canonicalPath").value("/seriler/renamed-series"));
        http.perform(get("/api/v1/series/"+id+"/chapters")).andExpect(jsonPath("$.items[0].id").value(ids.get(2)));
        http.perform(put("/api/v1/studio/series/"+id).cookie(cookie).with(csrf()).header("If-Match","\"1\"").contentType("application/json").content(body)).andExpect(status().isPreconditionFailed());
        articleAction(cookie,ids.get(0),2,"make-private",200);articleAction(cookie,ids.get(2),2,"make-private",200);
        http.perform(get("/api/v1/series/by-slug/first-series")).andExpect(status().isNotFound());http.perform(get("/api/v1/series/"+id+"/chapters")).andExpect(status().isNotFound());
        http.perform(get("/api/v1/series")).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void plannedListFiltersAndLiteralSearchNeverExposePrivateData() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var cookie=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        for(int hours:java.util.List.of(5,1)){
            var created=http.perform(post("/api/v1/studio/articles").cookie(cookie).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"planned-"+hours,"public"))).andExpect(status().isCreated()).andReturn();
            String id=new tools.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString()).get("id").asText();
            http.perform(post("/api/v1/studio/articles/"+id+"/actions").cookie(cookie).with(csrf()).header("If-Match","\"0\"").header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content("{\"action\":\"schedule\",\"scheduledAt\":\""+java.time.Instant.now().plusSeconds(hours*3600)+"\",\"timeZone\":\"Europe/Istanbul\"}")).andExpect(status().isOk());
        }
        http.perform(get("/api/v1/studio/articles").cookie(cookie).param("status","scheduled")).andExpect(jsonPath("$.sort").value("scheduled_asc")).andExpect(jsonPath("$.items[0].slug").value("planned-1")).andExpect(jsonPath("$.totalElements").value(2));
        http.perform(get("/api/v1/studio/articles").cookie(cookie).param("status","scheduled").param("sort","scheduled_desc")).andExpect(jsonPath("$.items[0].slug").value("planned-5"));
        http.perform(get("/api/v1/articles").param("q","Secret")).andExpect(jsonPath("$.totalElements").value(0));
        http.perform(get("/api/v1/studio/articles").cookie(cookie).param("q","%_")).andExpect(jsonPath("$.totalElements").value(0));
        http.perform(get("/api/v1/studio/articles").cookie(cookie).param("sort","DROP TABLE")).andExpect(status().isUnprocessableEntity());
    }
    private String seriesBody(java.util.List<String> ids,java.util.List<Long> versions,String slug){
        var mapper=new tools.jackson.databind.ObjectMapper();var body=new java.util.LinkedHashMap<String,Object>();body.put("title","A series");body.put("slug",slug);body.put("summary","Reading journey");body.put("ongoing",true);body.put("cover",java.util.Map.of("mode","none"));body.put("presentation",java.util.Map.of("heading","left","chapterStyle","cards"));body.put("seo",java.util.Map.of("indexable",true));body.put("chapterIds",ids);
        var items=new java.util.ArrayList<Object>();for(int i=0;i<versions.size();i++)items.add(java.util.Map.of("id",ids.get(i),"version",versions.get(i)));body.put("articleVersions",items);return mapper.writeValueAsString(body);
    }
    @Test void personalLibraryPreservesOrderAndRedactsHiddenArticles() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var result=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"library-article","public"))).andExpect(status().isCreated()).andReturn();
        String id=new tools.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).get("id").asText();articleAction(owner,id,0,"publish",200);
        UUID first=UUID.randomUUID(),second=UUID.randomUUID();createMember(first,"ACTIVE");createMember(second,"ACTIVE");var reader=login(first+"@test.invalid");var other=login(second+"@test.invalid");
        http.perform(put("/api/v1/me/bookmarks/"+id).cookie(reader).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isOk());
        var saved=jdbc.sql("select saved_at from bookmark where user_id=?").param(first).query(java.sql.Timestamp.class).single();
        var created=http.perform(post("/api/v1/me/collections").cookie(reader).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content("{\"name\":\"Türk edebiyatı\"}")).andExpect(status().isCreated()).andReturn();
        String collection=new tools.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString()).get("id").asText();
        http.perform(put("/api/v1/me/bookmarks/"+id).cookie(other).with(csrf()).contentType("application/json").content("{\"collectionId\":\""+collection+"\"}")).andExpect(status().isNotFound());
        http.perform(put("/api/v1/me/bookmarks/"+id).cookie(reader).with(csrf()).contentType("application/json").content("{\"collectionId\":\""+collection+"\"}")).andExpect(status().isOk());
        http.perform(put("/api/v1/me/bookmarks/"+id).cookie(reader).with(csrf()).contentType("application/json").content("{}")).andExpect(jsonPath("$.collectionId").value(collection));
        assertThat(jdbc.sql("select saved_at from bookmark where user_id=?").param(first).query(java.sql.Timestamp.class).single()).isEqualTo(saved);
        http.perform(get("/api/v1/me/bookmarks").cookie(other)).andExpect(jsonPath("$.totalElements").value(0));
        http.perform(get("/api/v1/articles/by-slug/library-article")).andExpect(jsonPath("$.stats.saves").value(1));
        http.perform(delete("/api/v1/me/collections/"+collection).cookie(other).with(csrf()).header("If-Match","\"0\"")).andExpect(status().isNotFound());
        http.perform(delete("/api/v1/me/collections/"+collection).cookie(reader).with(csrf()).header("If-Match","\"0\"")).andExpect(status().isNoContent());
        assertThat(jdbc.sql("select saved_at from bookmark where user_id=?").param(first).query(java.sql.Timestamp.class).single()).isEqualTo(saved);
        articleAction(owner,id,1,"make-private",200);
        http.perform(get("/api/v1/me/bookmarks").cookie(reader)).andExpect(jsonPath("$.items[0].available").value(false)).andExpect(jsonPath("$.items[0].article").isEmpty()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Secret title"))));
        http.perform(get("/api/v1/me/bookmarks").cookie(reader).param("q","Secret")).andExpect(jsonPath("$.totalElements").value(0));
        http.perform(get("/api/v1/me/article-state").cookie(reader).param("ids",id)).andExpect(jsonPath("$.items[0].available").value(false)).andExpect(jsonPath("$.items[0].bookmark").doesNotExist());
        http.perform(put("/api/v1/me/bookmarks/"+id).cookie(other).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isNotFound());
        http.perform(delete("/api/v1/me/bookmarks/"+id).cookie(reader).with(csrf())).andExpect(status().isNoContent());http.perform(delete("/api/v1/me/bookmarks/"+id).cookie(reader).with(csrf())).andExpect(status().isNoContent());
        assertThat(jdbc.sql("select count(*) from bookmark").query(Long.class).single()).isZero();
    }
    @Autowired com.satir.library.application.LibraryService library;
    @Test void concurrentBookmarkRetriesHaveOneAggregateEffect() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var result=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"concurrent-save","public"))).andExpect(status().isCreated()).andReturn();
        UUID article=UUID.fromString(new tools.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).get("id").asText());articleAction(owner,article.toString(),0,"publish",200);UUID reader=UUID.randomUUID();createMember(reader,"ACTIVE");
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(4)){
            var futures=new java.util.ArrayList<java.util.concurrent.Future<?>>();for(int i=0;i<8;i++)futures.add(executor.submit(()->library.save(reader,article,null)));for(var f:futures)f.get(10,java.util.concurrent.TimeUnit.SECONDS);
        }
        assertThat(jdbc.sql("select count(*) from bookmark").query(Integer.class).single()).isEqualTo(1);assertThat(jdbc.sql("select count(*) from bookmark").query(Long.class).single()).isEqualTo(1);
    }
    @Autowired com.satir.engagement.application.EngagementService engagement;
    @Test void anonymousClapsAndImpressionsRetryWithoutDoubleCounting() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var result=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"engagement-article","public"))).andExpect(status().isCreated()).andReturn();
        String id=new tools.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).get("id").asText();articleAction(owner,id,0,"publish",200);
        http.perform(get("/api/v1/articles/by-slug/engagement-article")).andExpect(jsonPath("$.stats.views").value(0));
        http.perform(get("/api/v1/articles/"+id+"/my-clap")).andExpect(jsonPath("$.clapped").value(false));
        var start=http.perform(post("/api/v1/engagement/session").with(csrf())).andExpect(status().isOk()).andReturn();
        var cookie=start.getResponse().getCookie("satir-actor-dev");assertThat(cookie.isHttpOnly()).isTrue();
        for(int i=0;i<2;i++)http.perform(put("/api/v1/articles/"+id+"/clap").cookie(cookie).with(csrf()).contentType("application/json").content("{\"clapped\":true}")).andExpect(jsonPath("$.claps").value(1));
        http.perform(get("/api/v1/articles/"+id+"/my-clap").cookie(cookie)).andExpect(jsonPath("$.clapped").value(true));
        var payload=new java.util.LinkedHashMap<String,Object>();payload.put("eventId",UUID.randomUUID());payload.put("articleId",id);payload.put("source","card");payload.put("pageViewId",UUID.randomUUID());payload.put("occurredAt",java.time.Instant.now().toString());var mapper=new tools.jackson.databind.ObjectMapper();
        http.perform(post("/api/v1/impressions").cookie(cookie).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(payload))).andExpect(jsonPath("$.counted").value(true));
        http.perform(post("/api/v1/impressions").cookie(cookie).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(payload))).andExpect(jsonPath("$.counted").value(false)).andExpect(jsonPath("$.views").value(1));
        payload.put("eventId",UUID.randomUUID());http.perform(post("/api/v1/impressions").cookie(cookie).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(payload))).andExpect(jsonPath("$.counted").value(false));
        payload.put("source","permalink");http.perform(post("/api/v1/impressions").cookie(cookie).with(csrf()).contentType("application/json").content(mapper.writeValueAsString(payload))).andExpect(status().isConflict());
        payload.put("eventId",UUID.randomUUID());http.perform(post("/api/v1/impressions").cookie(cookie).with(csrf()).header("User-Agent","Googlebot").contentType("application/json").content(mapper.writeValueAsString(payload))).andExpect(status().isUnprocessableEntity());
        http.perform(post("/api/v1/impressions").cookie(cookie).with(csrf()).header("Purpose","prefetch").contentType("application/json").content(mapper.writeValueAsString(payload))).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.sql("select views from article_totals").query(Long.class).single()).isEqualTo(1);
        articleAction(owner,id,1,"make-private",200);http.perform(get("/api/v1/articles/"+id+"/stats")).andExpect(status().isNotFound());
        http.perform(put("/api/v1/articles/"+id+"/clap").cookie(cookie).with(csrf()).contentType("application/json").content("{\"clapped\":true}")).andExpect(status().isNotFound());
    }
    @Test void simultaneousImpressionDeliveryAndClapHaveOneEffect() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var result=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"concurrent-engagement","public"))).andExpect(status().isCreated()).andReturn();
        UUID article=UUID.fromString(new tools.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString()).get("id").asText());articleAction(owner,article.toString(),0,"publish",200);
        var anon=engagement.start();var actor=new com.satir.engagement.application.EngagementService.Actor(anon.id(),false);UUID page=UUID.randomUUID();java.time.Instant occurred=java.time.Instant.now();
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(4)){
            var futures=new java.util.ArrayList<java.util.concurrent.Future<?>>();for(int i=0;i<8;i++)futures.add(executor.submit(()->{engagement.clap(article,actor,true);engagement.impression(actor,new com.satir.engagement.application.EngagementService.Impression(UUID.randomUUID(),article,"card",page,occurred));}));for(var future:futures)future.get(10,java.util.concurrent.TimeUnit.SECONDS);
        }
        assertThat(jdbc.sql("select count(*) from article_clap").query(Integer.class).single()).isEqualTo(1);assertThat(jdbc.sql("select views from article_totals").query(Long.class).single()).isEqualTo(1);assertThat(jdbc.sql("select count(*) from impression_receipt").query(Integer.class).single()).isEqualTo(8);
    }
    @Test void emailChangeIsVerifiedBeforeReplacingIdentityAndRevokesSessions() throws Exception {
        UUID id=UUID.randomUUID();createMember(id,"ACTIVE");var cookie=login(id+"@test.invalid");
        http.perform(post("/api/v1/me/email-change").cookie(cookie).with(csrf()).contentType("application/json").content("{\"email\":\"replacement@test.invalid\"}")).andExpect(status().isForbidden());
        var renewed=http.perform(post("/api/v1/auth/reauthenticate").cookie(cookie).with(csrf()).contentType("application/json").content("{\"password\":\"test-only-long-password\"}")).andExpect(status().isOk()).andReturn().getResponse().getCookie("satir-session-dev");
        http.perform(post("/api/v1/me/email-change").cookie(renewed).with(csrf()).contentType("application/json").content("{\"email\":\"replacement@test.invalid\"}")).andExpect(status().isAccepted());
        assertThat(jdbc.sql("select email from app_user where id=?").param(id).query(String.class).single()).isEqualTo(id+"@test.invalid");
        String token=rawToken();worker.runOne();assertThat(mail.recipients).containsExactly("replacement@test.invalid");
        assertThat(mail.delivered.getFirst()).contains("#purpose=EMAIL_CHANGE&token=");
        http.perform(post("/api/v1/auth/email-change/confirm").with(csrf()).contentType("application/json").content("{\"token\":\""+token+"\"}")).andExpect(status().isNoContent());
        http.perform(get("/api/v1/auth/session").cookie(renewed)).andExpect(jsonPath("$.authenticated").value(false));
        assertThat(jdbc.sql("select email from app_user where id=?").param(id).query(String.class).single()).isEqualTo("replacement@test.invalid");
        http.perform(post("/api/v1/auth/email-change/confirm").with(csrf()).contentType("application/json").content("{\"token\":\""+token+"\"}")).andExpect(status().isUnprocessableEntity());
    }
    @Test void accountDeletionErasesPersonalDataAndPreventsLateMutations() throws Exception {
        UUID id=UUID.randomUUID();createMember(id,"ACTIVE");var cookie=login(id+"@test.invalid");library.create(id,UUID.randomUUID().toString(),"Secret collection");
        http.perform(delete("/api/v1/me").cookie(cookie).with(csrf()).contentType("application/json").content("{\"confirmation\":\"DELETE\"}")).andExpect(status().isForbidden());
        var renewed=http.perform(post("/api/v1/auth/reauthenticate").cookie(cookie).with(csrf()).contentType("application/json").content("{\"password\":\"test-only-long-password\"}")).andExpect(status().isOk()).andReturn().getResponse().getCookie("satir-session-dev");
        http.perform(delete("/api/v1/me").cookie(renewed).with(csrf()).contentType("application/json").content("{\"confirmation\":\"DELETE\"}")).andExpect(status().isNoContent());
        http.perform(get("/api/v1/auth/session").cookie(renewed)).andExpect(jsonPath("$.authenticated").value(false));
        for(String table:java.util.List.of("password_credential","user_preference","collection","idempotency_record"))assertThat(jdbc.sql("select count(*) from "+table).query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("select email from app_user where id=?").param(id).query(String.class).optional()).isEmpty();
        assertThat(jdbc.sql("select status from app_user where id=?").param(id).query(String.class).single()).isEqualTo("DELETED");
        assertThatThrownBy(()->library.create(id,UUID.randomUUID().toString(),"Late save")).isInstanceOf(com.satir.platform.ApiException.class).hasMessage("SESSION_EXPIRED");
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        var ownerRenewed=http.perform(post("/api/v1/auth/reauthenticate").cookie(owner).with(csrf()).contentType("application/json").content("{\"password\":\"test-only-long-password\"}")).andExpect(status().isOk()).andReturn().getResponse().getCookie("satir-session-dev");
        http.perform(delete("/api/v1/me").cookie(ownerRenewed).with(csrf()).contentType("application/json").content("{\"confirmation\":\"DELETE\"}")).andExpect(status().isConflict());
    }
    @Test void passwordChangeRequiresRecentReauthenticationAndRevokesEverySession() throws Exception {
        UUID id=UUID.randomUUID();createMember(id,"ACTIVE");var first=login(id+"@test.invalid");var second=login(id+"@test.invalid");String body="{\"password\":\"new-test-only-password\",\"passwordConfirmation\":\"new-test-only-password\"}";
        http.perform(put("/api/v1/me/password").cookie(first).with(csrf()).contentType("application/json").content(body)).andExpect(status().isForbidden());
        var renewed=http.perform(post("/api/v1/auth/reauthenticate").cookie(first).with(csrf()).contentType("application/json").content("{\"password\":\"test-only-long-password\"}")).andExpect(status().isOk()).andReturn().getResponse().getCookie("satir-session-dev");
        http.perform(put("/api/v1/me/password").cookie(renewed).with(csrf()).contentType("application/json").content(body)).andExpect(status().isNoContent());
        for(var cookie:java.util.List.of(second,renewed))http.perform(get("/api/v1/auth/session").cookie(cookie)).andExpect(jsonPath("$.authenticated").value(false));
        assertThat(encoder.matches("new-test-only-password",jdbc.sql("select password_hash from password_credential where user_id=?").param(id).query(String.class).single())).isTrue();
    }
    @Test void annotationsValidateRevisionQuotesAndHidePrivateContent() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var result=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"annotated","public"))).andExpect(status().isCreated()).andReturn();var mapper=new tools.jackson.databind.ObjectMapper();var article=mapper.readTree(result.getResponse().getContentAsString());String id=article.get("id").asText(),revision=article.get("revisionId").asText();articleAction(owner,id,0,"publish",200);
        UUID readerId=UUID.randomUUID(),otherId=UUID.randomUUID();createMember(readerId,"ACTIVE");createMember(otherId,"ACTIVE");var reader=login(readerId+"@test.invalid");var other=login(otherId+"@test.invalid");UUID mark=UUID.randomUUID();
        String body="{\"kind\":\"note\",\"revisionId\":\""+revision+"\",\"fragments\":[{\"blockId\":\"00000000-0000-0000-0000-000000000001\",\"start\":0,\"end\":4,\"quote\":\"Real\",\"before\":\"\",\"after\":\" article\"}],\"note\":\"Private thought\"}";
        http.perform(put("/api/v1/me/articles/"+id+"/annotations/"+mark).cookie(reader).with(csrf()).contentType("application/json").content(body)).andExpect(status().isPreconditionRequired());
        http.perform(put("/api/v1/me/articles/"+id+"/annotations/"+mark).cookie(reader).with(csrf()).header("If-None-Match","*").contentType("application/json").content(body.replace("Real","Fake"))).andExpect(status().isUnprocessableEntity());
        http.perform(put("/api/v1/me/articles/"+id+"/annotations/"+mark).cookie(reader).with(csrf()).header("If-None-Match","*").contentType("application/json").content(body)).andExpect(status().isCreated());
        http.perform(get("/api/v1/me/articles/"+id+"/annotations").cookie(other)).andExpect(jsonPath("$.items").isEmpty());
        http.perform(put("/api/v1/me/articles/"+id+"/annotations/"+mark).cookie(reader).with(csrf()).header("If-Match","\"0\"").contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        http.perform(put("/api/v1/me/articles/"+id+"/annotations/"+mark).cookie(reader).with(csrf()).header("If-Match","\"0\"").contentType("application/json").content(body)).andExpect(status().isPreconditionFailed());
        String visits="{\"eventId\":\""+UUID.randomUUID()+"\",\"articleId\":\""+id+"\",\"revisionId\":\""+revision+"\",\"visitedAt\":\""+java.time.Instant.now()+"\"}";
        for(int i=0;i<2;i++)http.perform(post("/api/v1/me/visits").cookie(reader).with(csrf()).contentType("application/json").content(visits)).andExpect(status().isNoContent());
        assertThat(jdbc.sql("select count(*) from visit_receipt").query(Integer.class).single()).isEqualTo(1);http.perform(get("/api/v1/me/history").cookie(other)).andExpect(jsonPath("$.totalElements").value(0));
        articleAction(owner,id,1,"make-private",200);
        http.perform(get("/api/v1/me/articles/"+id+"/annotations").cookie(reader)).andExpect(jsonPath("$.items[0].id").value(mark.toString())).andExpect(jsonPath("$.available").value(false)).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Private thought"))));
        http.perform(get("/api/v1/me/history").cookie(reader)).andExpect(jsonPath("$.items[0].available").value(false)).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Secret title"))));
        http.perform(delete("/api/v1/me/articles/"+id+"/annotations/"+mark).cookie(reader).with(csrf())).andExpect(status().isNoContent());
    }
    @Test void serverSessionGenerationRejectsLateSessionAfterPasswordChange() throws Exception {
        UUID id=UUID.randomUUID();createMember(id,"ACTIVE");var cookie=login(id+"@test.invalid");
        // Emulates a request whose session persistence finishes after global revocation.
        jdbc.sql("update app_user set authentication_generation=authentication_generation+1 where id=?").param(id).update();
        http.perform(get("/api/v1/auth/session").cookie(cookie)).andExpect(jsonPath("$.authenticated").value(false));
    }
    @Test void themeDraftApplyAndPublicProjectionRespectLiveVisibility() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var result=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"featured","public"))).andExpect(status().isCreated()).andReturn();var mapper=new tools.jackson.databind.ObjectMapper();String id=mapper.readTree(result.getResponse().getContentAsString()).get("id").asText();articleAction(owner,id,0,"publish",200);
        String theme="{\"schemaVersion\":1,\"name\":\"Scene\",\"siteName\":\"SATIR\",\"accent\":\"#c8efbc\",\"typography\":\"modern\",\"surface\":\"paper\",\"width\":\"reading\",\"spacing\":\"airy\",\"blocks\":[{\"id\":\"scene\",\"kind\":\"scene\",\"title\":\"Owner scene\",\"emphasis\":\"A note\",\"description\":\"Intro\",\"featuredArticleId\":\""+id+"\",\"featuredSeriesId\":null,\"showFeaturedArticle\":true,\"showFeaturedSeries\":false}]}";
        var draft=http.perform(put("/api/v1/studio/theme/draft").cookie(owner).with(csrf()).header("If-Match","\"0\"").contentType("application/json").content(theme)).andExpect(status().isOk()).andReturn();String revision=mapper.readTree(draft.getResponse().getContentAsString()).get("draftRevisionId").asText();
        http.perform(get("/api/v1/site")).andExpect(jsonPath("$.theme.blocks").isEmpty()).andExpect(jsonPath("$.indexingEnabled").value(false));
        http.perform(post("/api/v1/studio/theme/apply").cookie(owner).with(csrf()).header("If-Match","\"1\"").header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content("{\"draftRevisionId\":\""+revision+"\"}")).andExpect(status().isOk());
        http.perform(get("/api/v1/site")).andExpect(jsonPath("$.theme.blocks[0].featuredArticle.title").value("Secret title"));
        articleAction(owner,id,1,"make-private",200);
        http.perform(get("/api/v1/site")).andExpect(jsonPath("$.theme.blocks[0].featuredArticleId").isEmpty()).andExpect(jsonPath("$.theme.blocks[0].featuredArticle").isEmpty()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Secret title"))));
        http.perform(patch("/api/v1/studio/site").cookie(owner).with(csrf()).header("If-Match","\"0\"").contentType("application/json").content("{\"indexingEnabled\":true}")).andExpect(status().isOk());
        http.perform(get("/api/v1/seo/urls")).andExpect(jsonPath("$.totalElements").value(0)); // Deployment indexing gate still closed.
        assertThat(jdbc.sql("select count(*) from editorial_indexable_urls").query(Integer.class).single()).isZero();
        http.perform(put("/api/v1/studio/theme/draft").cookie(owner).with(csrf()).header("If-Match","\"2\"").contentType("application/json").content(theme.replace("\"title\":\"Owner scene\"","\"html\":\"<script>\",\"title\":\"Owner scene\""))).andExpect(status().isUnprocessableEntity());
        http.perform(put("/api/v1/studio/theme/draft").cookie(owner).with(csrf()).header("If-Match","\"1\"").contentType("application/json").content(theme)).andExpect(status().isPreconditionFailed());
    }
    @Test void sanitizedMediaRequiresCurrentPublicReferenceEvenForRanges() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        var image=new java.awt.image.BufferedImage(8,6,java.awt.image.BufferedImage.TYPE_INT_RGB);var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"jpg",bytes);
        var file=new org.springframework.mock.web.MockMultipartFile("file","untrusted.jpg","image/jpeg",bytes.toByteArray());var key=UUID.randomUUID();
        var uploaded=http.perform(multipart("/api/v1/studio/media").file(file).cookie(owner).with(csrf()).header("Idempotency-Key",key)).andExpect(status().isAccepted()).andReturn();
        var mapper=new tools.jackson.databind.ObjectMapper();String asset=mapper.readTree(uploaded.getResponse().getContentAsString()).get("id").asText();
        http.perform(multipart("/api/v1/studio/media").file(file).cookie(owner).with(csrf()).header("Idempotency-Key",key)).andExpect(jsonPath("$.id").value(asset));
        http.perform(get("/api/v1/media/"+asset)).andExpect(status().isNotFound());
        http.perform(get("/api/v1/media/"+asset).cookie(owner)).andExpect(status().isOk()).andExpect(content().contentType("image/png")).andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store")));
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        String body=articleBody(category,"media-article","public").replace("\"mode\":\"none\",\"assetId\":null","\"mode\":\"manual\",\"assetId\":\""+asset+"\"");
        var article=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn();String id=mapper.readTree(article.getResponse().getContentAsString()).get("id").asText();
        articleAction(owner,id,0,"publish",200);
        http.perform(get("/api/v1/media/"+asset).header("Range","bytes=0-7")).andExpect(status().isPartialContent()).andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store")));
        String privateBody=articleBody(category,"private-media","private").replace("\"mode\":\"none\",\"assetId\":null","\"mode\":\"manual\",\"assetId\":\""+asset+"\"");
        http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(privateBody)).andExpect(status().isConflict());
        articleAction(owner,id,1,"make-private",200);
        http.perform(get("/api/v1/media/"+asset).header("Range","bytes=0-7")).andExpect(status().isNotFound());
        http.perform(delete("/api/v1/studio/media/"+asset).cookie(owner).with(csrf())).andExpect(status().isConflict());
        http.perform(multipart("/api/v1/studio/media").file(new org.springframework.mock.web.MockMultipartFile("file","fake.png","image/png","<script/>".getBytes())).cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID())).andExpect(status().isUnsupportedMediaType());
    }
    @Test void coverCandidatesStayPrivateExpireAndCleanPartialFailures() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'cover-topic','Cover',0)").param(category).update();
        var response=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"cover-test","public"))).andExpect(status().isCreated()).andReturn();
        var mapper=new tools.jackson.databind.ObjectMapper();UUID article=UUID.fromString(mapper.readTree(response.getResponse().getContentAsString()).path("id").asText());
        var image=new java.awt.image.BufferedImage(8,6,java.awt.image.BufferedImage.TYPE_INT_RGB);var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",bytes);
        coverProvider.enabled=true;
        var good=new com.satir.media.application.CoverProvider.Photo("test-photo","https://www.pexels.com/photo/test/","Test photographer","https://www.pexels.com/license/",bytes.toByteArray());
        coverProvider.photos=java.util.List.of(good);
        UUID job=UUID.fromString(mapper.valueToTree(coverJobs.create(UUID.fromString(jdbc.sql("select id from app_user where role='OWNER'").query(String.class).single()),"article",article,0,"Explicit query")).path("id").asText());
        assertThat(coverJobs.handle(job,"test")).isTrue();
        var ready=http.perform(get("/api/v1/studio/cover-jobs/"+job).cookie(owner)).andExpect(jsonPath("$.state").value("READY")).andExpect(jsonPath("$.candidates[0].photographer").value("Test photographer")).andReturn();
        String asset=mapper.readTree(ready.getResponse().getContentAsString()).path("candidates").get(0).path("assetId").asText();
        http.perform(get("/api/v1/media/"+asset)).andExpect(status().isNotFound());
        http.perform(get("/api/v1/media/"+asset).cookie(owner)).andExpect(status().isOk());
        jdbc.sql("update cover_job set expires_at=now()-interval '1 second' where id=?").param(job).update();
        http.perform(get("/api/v1/studio/cover-jobs/"+job).cookie(owner)).andExpect(status().isNotFound());
        coverRetention.clean();
        http.perform(get("/api/v1/media/"+asset).cookie(owner)).andExpect(status().isNotFound());
        coverProvider.photos=java.util.List.of(good,new com.satir.media.application.CoverProvider.Photo("broken","https://www.pexels.com/photo/broken/","Test","https://www.pexels.com/license/",new byte[]{1,2}));
        UUID failed=UUID.fromString(mapper.valueToTree(coverJobs.create(UUID.fromString(jdbc.sql("select id from app_user where role='OWNER'").query(String.class).single()),"article",article,0,"Explicit query")).path("id").asText());
        assertThat(coverJobs.handle(failed,"test-failure")).isTrue();
        http.perform(get("/api/v1/studio/cover-jobs/"+failed).cookie(owner)).andExpect(jsonPath("$.state").value("FAILED")).andExpect(jsonPath("$.candidates").isEmpty());
        assertThat(jdbc.sql("select count(*) from media_asset").query(Integer.class).single()).isZero();
    }
    @Test void explicitLegacyConversionProducesAValidDraftImportWithoutDemoSeeds() throws Exception {
        var directory=java.nio.file.Files.createTempDirectory("satir-legacy-test-");
        try {
            var content=directory.resolve("content.json");var theme=directory.resolve("theme.json");var output=directory.resolve("converted.zip");
            java.nio.file.Files.writeString(content,"""
              {"version":2,"articles":[{"slug":"legacy-writing","authored":true,"title":"Legacy writing","category":"Writing","createdAt":"2026-01-02T03:00:00Z","publishedAt":"2026-02-03","eyebrow":"Notes","excerpt":"Intro","paragraphs":["Legacy text"]}],"series":[{"slug":"legacy-series","title":"Legacy series","summary":"Intro","ongoing":true,"articleSlugs":["legacy-writing"]}]}
              """);
            java.nio.file.Files.writeString(theme,"""
              {"version":1,"draft":{"name":"Legacy theme","siteName":"SATIR","accent":"#aabbcc","typography":"modern","surface":"paper","width":"wide","spacing":"airy","blocks":[{"id":"scene","kind":"scene","title":"Hello","emphasis":"","description":"","featuredArticleSlug":"legacy-writing","featuredSeriesSlug":"legacy-series","showFeaturedArticle":true,"showFeaturedSeries":true}]}}
              """);
            var process=new ProcessBuilder("python3","scripts/convert-legacy-content.py","--content",content.toString(),"--theme",theme.toString(),"--output",output.toString()).redirectErrorStream(true).start();
            assertThat(process.waitFor(10,java.util.concurrent.TimeUnit.SECONDS)).isTrue();assertThat(process.exitValue()).withFailMessage(new String(process.getInputStream().readAllBytes())).isZero();
            byte[] bytes=java.nio.file.Files.readAllBytes(output);var decoded=archiveCodec.decode(bytes);
            assertThat(decoded.manifest().articles().getFirst().createdAt()).isEqualTo(java.time.Instant.parse("2026-01-02T03:00:00Z"));
            accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
            var result=http.perform(multipart("/api/v1/studio/imports/validate").file(new org.springframework.mock.web.MockMultipartFile("file","converted.zip","application/zip",bytes)).cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID())).andExpect(status().isAccepted()).andReturn();
            var mapper=new tools.jackson.databind.ObjectMapper();UUID id=UUID.fromString(mapper.readTree(result.getResponse().getContentAsString()).path("id").asText());archives.process(id,"ARCHIVE_VALIDATE");
            http.perform(get("/api/v1/studio/imports/"+id).cookie(owner)).andExpect(jsonPath("$.state").value("READY")).andExpect(jsonPath("$.plan.counts.articles").value(1)).andExpect(jsonPath("$.plan.publishState").value("draft"));
            http.perform(get("/api/v1/articles")).andExpect(jsonPath("$.totalElements").value(0));
        } finally {
            try(var paths=java.nio.file.Files.walk(directory)){for(var path:paths.sorted(java.util.Comparator.reverseOrder()).toList())java.nio.file.Files.delete(path);}
        }
    }
    @Test void googleStartRequiresCsrfAndUsesPkceNonceAndBoundState() throws Exception {
        http.perform(post("/api/v1/auth/google/start").contentType("application/json").content("{\"returnTo\":\"/hesap\"}")).andExpect(status().isForbidden());
        http.perform(post("/api/v1/auth/google/start").with(csrf()).contentType("application/json").content("{\"returnTo\":\"https://attacker.invalid\"}")).andExpect(status().isUnprocessableEntity());
        http.perform(post("/api/v1/auth/google/start").with(csrf()).contentType("application/json").content("{\"returnTo\":\"/hesap\",\"purpose\":\"reauth\"}")).andExpect(status().isUnauthorized());
        var started=http.perform(post("/api/v1/auth/google/start").with(csrf()).contentType("application/json").content("{\"returnTo\":\"/hesap\"}")).andExpect(status().isOk()).andReturn();
        var cookie=started.getResponse().getCookie("satir-session-dev");
        var redirect=http.perform(get("/api/v1/auth/google/authorize/google").cookie(cookie)).andExpect(status().is3xxRedirection()).andReturn().getResponse().getHeader("Location");
        assertThat(redirect).startsWith("https://accounts.google.com/").contains("code_challenge_method=S256","code_challenge=","nonce=","state=");
        assertThat(redirect).doesNotContain("test-client-secret");
        http.perform(get("/api/v1/auth/google/callback").param("code","untrusted").param("state","wrong")).andExpect(status().isSeeOther()).andExpect(header().string("Location","/giris?error=google"));
    }
    @Test void verifiedGoogleClaimsCannotMergeAccountsAndLastMethodCannotBeUnlinked() {
        UUID member=UUID.randomUUID();createMember(member,"ACTIVE");
        UUID attempt=google.start(null,"login","/hesap");
        assertThatThrownBy(()->google.complete(attempt,null,"google-existing",member+"@test.invalid",true,"Other")).isInstanceOf(com.satir.platform.ApiException.class).hasMessage("ACCOUNT_LINK_REQUIRED");
        assertThatThrownBy(()->google.complete(attempt,null,"google-existing",member+"@test.invalid",true,"Other")).isInstanceOf(com.satir.platform.ApiException.class).hasMessage("INVALID_OAUTH_STATE");
        UUID unverified=google.start(null,"login","/hesap");assertThatThrownBy(()->google.complete(unverified,null,"bad","new@test.invalid",false,"New")).isInstanceOf(com.satir.platform.ApiException.class).hasMessage("GOOGLE_EMAIL_UNVERIFIED");
        UUID signup=google.start(null,"login","/hesap");var created=google.complete(signup,null,"google-new","new@test.invalid",true,"New");assertThat(created.account().active()).isTrue();assertThat(created.account().owner()).isFalse();
        assertThatThrownBy(()->google.unlink(created.account().id())).isInstanceOf(com.satir.platform.ApiException.class).hasMessage("LAST_LOGIN_METHOD");
        UUID wrong=google.start(member,"link","/hesap");assertThatThrownBy(()->google.complete(wrong,created.account().id(),"other-subject","new@test.invalid",true,"New")).isInstanceOf(com.satir.platform.ApiException.class).hasMessage("INVALID_OAUTH_STATE");
        UUID link=google.start(member,"link","/hesap");google.complete(link,member,"google-member",member+"@test.invalid",true,"Member");google.unlink(member);assertThat(google.connections(member)).isEmpty();
        var owner=accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");assertThatThrownBy(()->google.start(owner.id(),"link","/hesap")).isInstanceOf(com.satir.platform.ApiException.class).hasMessage("OWNER_GOOGLE_DISABLED");
    }
    @Test void domainArchiveRestoresOnlyDraftsAndNeverOverwritesSlugs() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");var owner=login("testowner");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var created=http.perform(post("/api/v1/studio/articles").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(articleBody(category,"archive-source","private"))).andExpect(status().isCreated()).andReturn();
        var mapper=new tools.jackson.databind.ObjectMapper();String source=mapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
        http.perform(post("/api/v1/studio/exports").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID())).andExpect(status().isForbidden());
        owner=http.perform(post("/api/v1/auth/reauthenticate").cookie(owner).with(csrf()).contentType("application/json").content("{\"password\":\"test-only-long-password\"}")).andExpect(status().isOk()).andReturn().getResponse().getCookie("satir-session-dev");
        var exported=http.perform(post("/api/v1/studio/exports").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID())).andExpect(status().isAccepted()).andReturn();
        UUID job=UUID.fromString(mapper.readTree(exported.getResponse().getContentAsString()).get("id").asText());archives.process(job,"ARCHIVE_EXPORT");
        byte[] archive=http.perform(get("/api/v1/studio/exports/"+job+"/download").cookie(owner)).andExpect(status().isOk()).andExpect(header().string("Cache-Control",org.hamcrest.Matchers.containsString("no-store"))).andReturn().getResponse().getContentAsByteArray();
        http.perform(get("/api/v1/studio/exports/"+job+"/download")).andExpect(status().isUnauthorized());
        var decoded=archiveCodec.decode(archive);assertThat(decoded.manifest().articles()).hasSize(1);assertThat(mapper.writeValueAsString(decoded.manifest())).doesNotContain("owner@test.invalid","password","ROLE_OWNER");
        var upload=http.perform(multipart("/api/v1/studio/imports/validate").file(new org.springframework.mock.web.MockMultipartFile("file","backup.zip","application/zip",archive)).cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID())).andExpect(status().isAccepted()).andReturn();
        UUID conflicting=UUID.fromString(mapper.readTree(upload.getResponse().getContentAsString()).get("id").asText());archives.process(conflicting,"ARCHIVE_VALIDATE");
        http.perform(get("/api/v1/studio/imports/"+conflicting).cookie(owner)).andExpect(jsonPath("$.state").value("INVALID")).andExpect(jsonPath("$.plan.errors[0].code").value("ARTICLE_SLUG_CONFLICT"));
        var node=(tools.jackson.databind.node.ObjectNode)mapper.valueToTree(decoded.manifest());((tools.jackson.databind.node.ObjectNode)node.get("articles").get(0).get("input")).put("slug","archive-restored");
        var manifest=mapper.treeToValue(node,com.satir.site.application.ArchiveManifest.class);byte[] restored=archiveCodec.encode(manifest,decoded.media());
        var accepted=http.perform(multipart("/api/v1/studio/imports/validate").file(new org.springframework.mock.web.MockMultipartFile("file","backup.zip","application/zip",restored)).cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID())).andExpect(status().isAccepted()).andReturn();
        UUID imported=UUID.fromString(mapper.readTree(accepted.getResponse().getContentAsString()).get("id").asText());archives.process(imported,"ARCHIVE_VALIDATE");
        http.perform(get("/api/v1/studio/imports/"+imported).cookie(owner)).andExpect(jsonPath("$.state").value("READY"));
        UUID key=UUID.randomUUID();String body="{\"validationVersion\":1}";
        http.perform(post("/api/v1/studio/imports/"+imported+"/commit").cookie(owner).with(csrf()).header("Idempotency-Key",key).contentType("application/json").content(body)).andExpect(status().isAccepted());
        http.perform(post("/api/v1/studio/imports/"+imported+"/commit").cookie(owner).with(csrf()).header("Idempotency-Key",key).contentType("application/json").content(body)).andExpect(status().isAccepted());
        archives.process(imported,"ARCHIVE_COMMIT");http.perform(get("/api/v1/studio/imports/"+imported).cookie(owner)).andExpect(jsonPath("$.state").value("COMMITTED"));
        http.perform(get("/api/v1/articles/by-slug/archive-restored")).andExpect(status().isNotFound());
        assertThat(jdbc.sql("select status from article where slug='archive-restored'").query(String.class).single()).isEqualTo("draft");assertThat(jdbc.sql("select visibility from article where slug='archive-restored'").query(String.class).single()).isEqualTo("private");assertThat(jdbc.sql("select count(*) from article_import_provenance").query(Integer.class).single()).isEqualTo(1);assertThat(jdbc.sql("select indexing_enabled from site_settings").query(Boolean.class).single()).isFalse();
    }
    @Test void ownerMemberAndStatsViewsExcludePrivateMemberRecords() throws Exception {
        accounts.bootstrap("testowner","owner@test.invalid","Owner","test-only-long-password");UUID member=UUID.randomUUID();createMember(member,"ACTIVE");var owner=login("testowner");var cookie=login(member+"@test.invalid");
        http.perform(get("/api/v1/studio/members").cookie(owner)).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(member.toString())).andExpect(jsonPath("$.items[0].bookmarks").doesNotExist());
        http.perform(get("/api/v1/studio/members").cookie(cookie)).andExpect(status().isForbidden());http.perform(get("/api/v1/studio/article-stats").cookie(cookie)).andExpect(status().isForbidden());http.perform(get("/api/v1/studio/article-stats").cookie(owner)).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        http.perform(post("/api/v1/studio/cover-jobs").cookie(owner).with(csrf()).header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content("{\"resourceType\":\"article\",\"resourceId\":\""+UUID.randomUUID()+"\",\"resourceVersion\":0}")).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("COVER_PROVIDER_UNAVAILABLE"));
    }
    private String articleBody(UUID category,String slug,String visibility){return "{\"title\":\"Secret title\",\"slug\":\""+slug+"\",\"eyebrow\":\"Software\",\"abstract\":\"Summary\",\"displayDate\":\"2026-10-05\",\"categoryIds\":[\""+category+"\"],\"document\":{\"schemaVersion\":1,\"blocks\":[{\"id\":\"00000000-0000-0000-0000-000000000001\",\"type\":\"paragraph\",\"text\":\"Real article body.\"}]},\"presentation\":{\"width\":\"comfortable\",\"heading\":\"left\",\"showMeta\":true},\"seo\":{\"title\":null,\"description\":null,\"indexable\":true},\"cover\":{\"mode\":\"none\",\"assetId\":null},\"seriesPlacement\":null,\"seriesVersions\":[],\"visibility\":\""+visibility+"\"}";}
    private void articleAction(jakarta.servlet.http.Cookie cookie,String id,long version,String action,int status)throws Exception{
        http.perform(post("/api/v1/studio/articles/"+id+"/actions").cookie(cookie).with(csrf()).header("If-Match","\""+version+"\"").header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content("{\"action\":\""+action+"\"}")).andExpect(status().is(status));
    }
    private String rawToken(){return jdbc.sql("select id,delivery_secret from action_token order by expires_at desc limit 1").query((r,n)->cipher.decrypt(r.getBytes("delivery_secret"),r.getObject("id",UUID.class).toString())).single();}
    private jakarta.servlet.http.Cookie login(String identifier) throws Exception {
        return http.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"identifier\":\""+identifier+"\",\"password\":\"test-only-long-password\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getCookie("satir-session-dev");
    }
    private void createMember(UUID id,String status) {
        jdbc.sql("insert into app_user(id,name,email,role,status,created_at) values (?,'Member',?,'MEMBER',?,now())").params(id,id+"@test.invalid",status).update();
        jdbc.sql("insert into user_preference(user_id) values (?)").param(id).update();
        jdbc.sql("insert into password_credential values (?,?,now())").params(id,encoder.encode("test-only-long-password")).update();
    }
}
