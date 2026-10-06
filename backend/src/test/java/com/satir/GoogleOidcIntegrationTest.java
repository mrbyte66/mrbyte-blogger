package com.satir;

import com.sun.net.httpserver.HttpServer;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import jakarta.servlet.http.Cookie;
import java.net.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(GoogleOidcIntegrationTest.ProviderConfiguration.class)
class GoogleOidcIntegrationTest {
    static final tools.jackson.databind.ObjectMapper mapper=new tools.jackson.databind.ObjectMapper();
    static final RSAKey key=key();static final RSAKey wrongKey=key();static final Map<String,Exchange> exchanges=new ConcurrentHashMap<>();
    static final HttpServer provider=server();static final String issuer="http://127.0.0.1:"+provider.getAddress().getPort();
    record Exchange(String nonce,String challenge,String failure,String subject){}
    static RSAKey key(){try{return new RSAKeyGenerator(2048).keyID("provider-test-key").generate();}catch(Exception e){throw new IllegalStateException(e);}}
    static HttpServer server(){try{var s=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);s.createContext("/jwks",e->{byte[] data=new JWKSet(key.toPublicJWK()).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type","application/json");e.sendResponseHeaders(200,data.length);e.getResponseBody().write(data);e.close();});s.createContext("/token",e->{try{var params=params(new String(e.getRequestBody().readNBytes(16384),java.nio.charset.StandardCharsets.UTF_8));var flow=exchanges.get(params.get("code"));if(flow==null)throw new IllegalStateException();String actual=Base64.getUrlEncoder().withoutPadding().encodeToString(java.security.MessageDigest.getInstance("SHA-256").digest(params.get("code_verifier").getBytes(java.nio.charset.StandardCharsets.US_ASCII)));if(!actual.equals(flow.challenge()))throw new IllegalStateException("PKCE mismatch");var claims=new JWTClaimsSet.Builder().issuer(flow.failure().equals("issuer")?"https://untrusted.invalid":issuer).audience(flow.failure().equals("audience")?"another-client":"test-client").subject(flow.subject()).issueTime(Date.from(Instant.now())).expirationTime(Date.from(Instant.now().plusSeconds(300))).claim("nonce",flow.failure().equals("nonce")?"wrong-nonce":flow.nonce()).claim("email",flow.subject()+"@test.invalid").claim("email_verified",!flow.failure().equals("unverified")).claim("name","Reader").build();var jwt=new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),claims);jwt.sign(new RSASSASigner(flow.failure().equals("signature")?wrongKey:key));byte[] data=mapper.writeValueAsBytes(Map.of("access_token","test-token","token_type","Bearer","expires_in",300,"id_token",jwt.serialize()));e.getResponseHeaders().set("Content-Type","application/json");e.sendResponseHeaders(200,data.length);e.getResponseBody().write(data);}catch(Exception x){e.sendResponseHeaders(400,-1);}finally{e.close();}});s.start();return s;}catch(Exception e){throw new IllegalStateException(e);}}
    static Map<String,String> params(String value){var values=new HashMap<String,String>();for(String p:value.split("&")){String[] pair=p.split("=",2);values.put(URLDecoder.decode(pair[0],java.nio.charset.StandardCharsets.UTF_8),pair.length>1?URLDecoder.decode(pair[1],java.nio.charset.StandardCharsets.UTF_8):"");}return values;}
    @org.springframework.boot.test.context.TestConfiguration
    static class ProviderConfiguration {
        @Bean ClientRegistrationRepository providerRegistrations(){return new InMemoryClientRegistrationRepository(ClientRegistration.withRegistrationId("google").clientId("test-client").clientSecret("test-secret").clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC).authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE).redirectUri("http://localhost:3000/api/v1/auth/google/callback").scope("openid","email").authorizationUri(issuer+"/authorize").tokenUri(issuer+"/token").jwkSetUri(issuer+"/jwks").issuerUri(issuer).userNameAttributeName("sub").clientName("Test Google issuer").build());}
    }
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){r.add("spring.datasource.url",()->System.getenv("SATIR_TEST_DB_URL"));r.add("spring.datasource.username",()->System.getenv("SATIR_TEST_DB_USER"));r.add("spring.datasource.password",()->System.getenv("SATIR_TEST_DB_PASSWORD"));r.add("satir.migration-mode",()->"migrate");r.add("satir.workers-enabled",()->false);r.add("satir.rate-secret",()->"disposable-only-test-hmac-secret-32-chars");r.add("TOKEN_ENCRYPTION_KEY",()->"dGVzdC1vbmx5LWtleS0zMi1ieXRlcy0wMDAwMDAwMDA=");r.add("server.servlet.session.cookie.secure",()->false);r.add("server.servlet.session.cookie.name",()->"satir-session-dev");}
    @Autowired MockMvc http;@Autowired JdbcClient jdbc;
    @BeforeEach void clear(){exchanges.clear();jdbc.sql("truncate spring_session,app_user,auth_rate_bucket,outbox_job,idempotency_record cascade").update();}
    @AfterAll static void stop(){provider.stop(0);}
    record Flow(Cookie cookie,String state,String code){}
    Flow start(String failure)throws Exception{
        var started=http.perform(post("/api/v1/auth/google/start").with(csrf()).contentType("application/json").content("{\"returnTo\":\"/hesap\",\"purpose\":\"login\"}")).andExpect(status().isOk()).andReturn().getResponse();Cookie cookie=started.getCookie("satir-session-dev");
        String url=mapper.readTree(started.getContentAsString()).get("authorizationUrl").asText();
        var response=http.perform(get(url).cookie(cookie)).andExpect(status().isFound()).andReturn().getResponse();var values=params(URI.create(response.getHeader("Location")).getRawQuery());assertThat(values.get("code_challenge_method")).isEqualTo("S256");assertThat(values.get("nonce")).isNotBlank();String code=UUID.randomUUID().toString();exchanges.put(code,new Exchange(values.get("nonce"),values.get("code_challenge"),failure,"user-"+UUID.randomUUID()));return new Flow(cookie,values.get("state"),code);
    }
    @Test void realOidcFilterValidatesSignedTokenAndCreatesCookieOnlyMemberSession()throws Exception{
        Flow f=start("");var response=http.perform(get("/api/v1/auth/google/callback").cookie(f.cookie()).param("state",f.state()).param("code",f.code())).andExpect(status().isSeeOther()).andExpect(header().string("Location","/hesap")).andReturn().getResponse();Cookie cookie=response.getCookie("satir-session-dev");assertThat(cookie).isNotNull();
        http.perform(get("/api/v1/auth/session").cookie(cookie)).andExpect(jsonPath("$.authenticated").value(true)).andExpect(jsonPath("$.profile.role").value("member")).andExpect(jsonPath("$.profile.verified").value(true));http.perform(get("/api/v1/studio/articles").cookie(cookie)).andExpect(status().isForbidden());assertThat(jdbc.sql("select count(*) from external_identity").query(Integer.class).single()).isEqualTo(1);
        http.perform(get("/api/v1/auth/google/callback").cookie(f.cookie()).param("state",f.state()).param("code",f.code())).andExpect(header().string("Location","/giris?error=google"));
    }
    @Test void signatureIssuerAudienceNonceAndUnverifiedEmailCannotCreateAccounts()throws Exception{for(String failure:List.of("signature","issuer","audience","nonce","unverified")){Flow f=start(failure);http.perform(get("/api/v1/auth/google/callback").cookie(f.cookie()).param("state",f.state()).param("code",f.code())).andExpect(status().isSeeOther()).andExpect(header().string("Location","/giris?error=google"));assertThat(jdbc.sql("select count(*) from app_user").query(Integer.class).single()).as(failure).isZero();}}
    @Test void mismatchedStateCannotExchangeAuthorizationCode()throws Exception{Flow f=start("");http.perform(get("/api/v1/auth/google/callback").cookie(f.cookie()).param("state","untrusted-state").param("code",f.code())).andExpect(header().string("Location","/giris?error=google"));assertThat(jdbc.sql("select count(*) from app_user").query(Integer.class).single()).isZero();}
}
