package com.satir;

import com.satir.editorial.application.ArticleInput;
import com.satir.editorial.application.ArticleService;
import com.satir.identity.application.AccountService;
import com.satir.site.application.SiteService;
import com.satir.site.domain.ThemeDocument;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;

/** Explicit full-stack acceptance: build frontend with BACKEND_INTERNAL_URL=http://127.0.0.1:18081 first.
 * Runs only against the disposable test database; never seeds a real installation. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.DEFINED_PORT)
class FrontendAcceptanceIT {
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        IdentityIntegrationTest.database(r);
        r.add("server.port",()->18081);
        r.add("satir.public-origin",()->"http://127.0.0.1:18080");
        r.add("satir.indexing-enabled",()->true);
    }
    @Autowired AccountService accounts;
    @Autowired ArticleService articles;
    @Autowired SiteService site;
    @Autowired JdbcClient jdbc;
    @Autowired ObjectMapper mapper;
    private final HttpClient guest=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).followRedirects(HttpClient.Redirect.NEVER).build();
    private HttpResponse<String> get(HttpClient client,String path)throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:18080"+path)).timeout(Duration.ofSeconds(30)).GET().build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> command(HttpClient client,String path,String method,String body,String version)throws Exception {
        String token=mapper.readTree(get(client,"/api/v1/auth/csrf").body()).get("token").asText();
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:18080/api/v1"+path)).timeout(Duration.ofSeconds(30)).header("Origin","http://127.0.0.1:18080").header("X-CSRF-TOKEN",token).header("Idempotency-Key",UUID.randomUUID().toString()).header("Content-Type","application/json");
        if(version!=null)request.header("If-Match","\""+version+"\"");
        return client.send(request.method(method,HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
    private ArticleInput input(String slug,String title,String visibility,UUID category){
        return mapper.readValue("""
            {"title":"%s","slug":"%s","eyebrow":"Software","abstract":"Public synopsis","displayDate":"2026-10-05","categoryIds":["%s"],
             "document":{"schemaVersion":1,"blocks":[{"id":"00000000-0000-0000-0000-000000000011","type":"paragraph","text":"Actual server-rendered body. <script>untrusted text</script>"}]},
             "presentation":{"width":"comfortable","heading":"left","showMeta":true},"seo":{"title":null,"description":null,"indexable":true},"cover":{"mode":"none","assetId":null},"seriesPlacement":null,"seriesVersions":[],"visibility":%s}
            """.formatted(title,slug,category,visibility==null?"null":"\""+visibility+"\""),ArticleInput.class);
    }
    @Test void cleanBackendAndProductionNextRespectSeoSessionsAndRevocation()throws Exception {
        String url=System.getenv("SATIR_TEST_DB_URL");assertThat(url).contains("/satir_test_");
        jdbc.sql("truncate spring_session, app_user, category, auth_rate_bucket, outbox_job, idempotency_record cascade").update();
        jdbc.sql("update theme_workspace set draft_revision_id='00000000-0000-0000-0000-000000000001',applied_revision_id='00000000-0000-0000-0000-000000000001',version=0").update();
        jdbc.sql("update site_settings set indexing_enabled=false,version=0").update();
        var owner=accounts.bootstrap("e2eowner","e2e@test.invalid","Owner","test-only-long-password");
        UUID category=UUID.randomUUID();jdbc.sql("insert into category values (?,'yazilim','Yazılım',0)").param(category).update();
        var visible=articles.create(owner.id(),UUID.randomUUID().toString(),input("crawlable","Crawlable acceptance article","public",category));
        UUID id=UUID.fromString(visible.get("id").asText());articles.action(id,owner.id(),UUID.randomUUID().toString(),0,new ArticleService.Action("publish",null,null,null,null));
        articles.create(owner.id(),UUID.randomUUID().toString(),input("private-secret","Never leak this private title","private",category));
        articles.create(owner.id(),UUID.randomUUID().toString(),input("draft-secret","Never leak this draft title","public",category));
        var theme=mapper.readValue("""
            {"schemaVersion":1,"name":"Acceptance","siteName":"SATIR","accent":"#c8efbc","typography":"modern","surface":"paper","width":"reading","spacing":"airy","blocks":[{"id":"articles","kind":"articles","title":"Yazılar","categoryId":null,"display":"cards","loading":"all"}]}
            """,ThemeDocument.class);
        var draft=mapper.valueToTree(site.draft(0,theme));site.apply(owner.id(),UUID.randomUUID().toString(),1,UUID.fromString(draft.get("draftRevisionId").asText()));
        site.settings(0,new SiteService.Patch("Owner",new ArticleInput.Seo("SATIR","Acceptance site",true),true));
        var backendReady=guest.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:18081/api/v1/site")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(backendReady.statusCode()).withFailMessage("Backend site: %s",backendReady.body()).isEqualTo(200);
        Path frontend=Path.of("../frontend").toRealPath(),log=Files.createTempFile("satir-next-acceptance-",".log");
        var builder=new ProcessBuilder("node","node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p","18080").directory(frontend.toFile()).redirectErrorStream(true).redirectOutput(log.toFile());
        builder.environment().put("BACKEND_INTERNAL_URL","http://127.0.0.1:18081");
        builder.environment().put("PORT","18080");builder.environment().put("HOSTNAME","127.0.0.1");
        Process next=builder.start();
        try {
            long deadline=System.nanoTime()+Duration.ofSeconds(45).toNanos();boolean ready=false;String probeResult="Not contacted";
            while(System.nanoTime()<deadline&&next.isAlive()){try{var probe=get(guest,"/health");probeResult=probe.statusCode()+":"+probe.body();if(probe.statusCode()==200){ready=true;break;}}catch(java.io.IOException error){probeResult=error.getClass().getSimpleName()+":"+error.getMessage();}Thread.sleep(250);}
            assertThat(ready).withFailMessage("Next did not start: %s; probe: %s",Files.readString(log),probeResult).isTrue();
            var page=get(guest,"/yazilar/crawlable");assertThat(page.statusCode()).isEqualTo(200);
            assertThat(page.body()).contains("Crawlable acceptance article","Actual server-rendered body.","application/ld+json","http://127.0.0.1:18080/yazilar/crawlable","index, follow").doesNotContain("<script>untrusted text</script>","Never leak this private title","Never leak this draft title");
            for(String path:List.of("/yazilar/private-secret","/yazilar/draft-secret")){var hidden=get(guest,path);assertThat(hidden.statusCode()).isEqualTo(404);assertThat(hidden.body()).doesNotContain("Never leak this");}
            var sitemap=get(guest,"/sitemap.xml");assertThat(sitemap.statusCode()).isEqualTo(200);assertThat(sitemap.body()).contains("/yazilar/crawlable").doesNotContain("private-secret","draft-secret","/hesap","/studio");
            for(String path:List.of("/hesap","/kaydedilenler","/giris","/studio")){var personal=get(guest,path);assertThat(personal.headers().firstValue("X-Robots-Tag")).contains("noindex, nofollow");assertThat(personal.body()).contains("noindex, nofollow");assertThat(personal.headers().firstValue("cache-control").orElse("")).contains("no-store");}
            assertThat(jdbc.sql("select views from article_totals where article_id=?").param(id).query(Long.class).single()).isZero();
            var ownerCookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);var client=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).cookieHandler(ownerCookies).followRedirects(HttpClient.Redirect.NEVER).build();
            assertThat(command(client,"/auth/login","POST","{\"identifier\":\"e2eowner\",\"password\":\"test-only-long-password\"}",null).statusCode()).isEqualTo(200);
            assertThat(get(client,"/api/v1/auth/session").body()).contains("\"authenticated\":true");
            assertThat(get(client,"/api/v1/studio/articles").body()).contains("Never leak this private title");
            assertThat(get(client,"/studio").statusCode()).isEqualTo(200);
            articles.update(id,1,input("renamed","Crawlable acceptance article",null,category));
            var alias=get(guest,"/yazilar/crawlable");assertThat(alias.statusCode()).isEqualTo(308);assertThat(alias.headers().firstValue("location")).contains("/yazilar/renamed");
            assertThat(command(client,"/studio/articles/"+id+"/actions","POST","{\"action\":\"make-private\"}","2").statusCode()).isEqualTo(200);
            for(String slug:List.of("renamed","crawlable")){var hidden=get(guest,"/yazilar/"+slug);assertThat(hidden.statusCode()).isEqualTo(404);assertThat(hidden.body()).doesNotContain("Crawlable acceptance article","Actual server-rendered body.");}
            var rsc=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).followRedirects(HttpClient.Redirect.NORMAL).build().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:18080/yazilar/renamed?_rsc=acceptance")).header("RSC","1").GET().build(),HttpResponse.BodyHandlers.ofString());
            assertThat(rsc.statusCode()).isIn(200,404);assertThat(rsc.body()).contains("NEXT_HTTP_ERROR_FALLBACK;404").doesNotContain("Crawlable acceptance article","Actual server-rendered body.");
            assertThat(get(guest,"/sitemap.xml").body()).doesNotContain("crawlable","renamed");
            assertThat(get(guest,"/yazilar?q=private").body()).doesNotContain("Never leak this private title");
            assertThat(command(client,"/auth/logout","POST","{}",null).statusCode()).isEqualTo(204);
            assertThat(get(client,"/studio").body()).doesNotContain("Never leak this private title");
            int inspectSeconds=Integer.parseInt(System.getenv().getOrDefault("SATIR_ACCEPTANCE_HOLD_SECONDS","0"));
            if(inspectSeconds>0){
                var example=articles.create(owner.id(),UUID.randomUUID().toString(),input("ui-verification","Arayüz doğrulama yazısı","public",category));
                articles.action(UUID.fromString(example.get("id").asText()),owner.id(),UUID.randomUUID().toString(),0,new ArticleService.Action("publish",null,null,null,null));
                Thread.sleep(Math.min(inspectSeconds,180)*1000L);
            }
        } finally {next.destroy();if(!next.waitFor(5,java.util.concurrent.TimeUnit.SECONDS))next.destroyForcibly();}
    }
}
