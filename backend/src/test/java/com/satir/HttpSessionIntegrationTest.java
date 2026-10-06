package com.satir;

import com.satir.identity.application.AccountService;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class HttpSessionIntegrationTest {
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){IdentityIntegrationTest.database(r);}
    @LocalServerPort int port;
    @Autowired AccountService accounts;
    @Autowired JdbcClient jdbc;
    @Test void actualServerPersistsRotatesAndRevokesHttpOnlySession()throws Exception{
        jdbc.sql("truncate spring_session, app_user, category, auth_rate_bucket, outbox_job, idempotency_record cascade").update();
        accounts.bootstrap("httptestowner","httpowner@test.invalid","Owner","test-only-long-password");
        var cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);var client=HttpClient.newBuilder().cookieHandler(cookies).build();
        var readiness=client.send(HttpRequest.newBuilder(url("/actuator/health/readiness")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(readiness.statusCode()).isEqualTo(200);assertThat(readiness.body()).contains("UP");
        var csrf=client.send(HttpRequest.newBuilder(url("/api/v1/auth/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
        String before=cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("satir-session-dev")).findFirst().orElseThrow().getValue();
        String token=new tools.jackson.databind.ObjectMapper().readTree(csrf.body()).get("token").asText();
        var login=client.send(HttpRequest.newBuilder(url("/api/v1/auth/login")).header("X-CSRF-TOKEN",token).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{\"identifier\":\"httptestowner\",\"password\":\"test-only-long-password\"}")).build(),HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        String after=cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("satir-session-dev")).findFirst().orElseThrow().getValue();assertThat(after).isNotEqualTo(before);
        assertThat(login.headers().allValues("set-cookie").toString()).contains("HttpOnly","SameSite=Lax");
        assertThat(jdbc.sql("select count(*) from spring_session where principal_name is not null").query(Integer.class).single()).isEqualTo(1);
        var session=client.send(HttpRequest.newBuilder(url("/api/v1/auth/session")).GET().build(),HttpResponse.BodyHandlers.ofString());assertThat(session.body()).contains("\"authenticated\":true");
        var nextCsrf=client.send(HttpRequest.newBuilder(url("/api/v1/auth/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());token=new tools.jackson.databind.ObjectMapper().readTree(nextCsrf.body()).get("token").asText();
        var logout=client.send(HttpRequest.newBuilder(url("/api/v1/auth/logout")).header("X-CSRF-TOKEN",token).POST(HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.ofString());assertThat(logout.statusCode()).isEqualTo(204);
        var guest=client.send(HttpRequest.newBuilder(url("/api/v1/auth/session")).GET().build(),HttpResponse.BodyHandlers.ofString());assertThat(guest.body()).contains("\"authenticated\":false");
    }
    private URI url(String path){return URI.create("http://127.0.0.1:"+port+path);}
}
