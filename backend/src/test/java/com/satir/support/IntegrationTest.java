package com.satir.support;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.satir.identity.application.OwnerBootstrapService;

/** Full application on a random port against real PostgreSQL; every test starts from empty tables. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(IntegrationTest.TestConfig.class)
public abstract class IntegrationTest {

    public static final String OWNER_EMAIL = "Sahip@Example.test";
    public static final String OWNER_USERNAME = "mrbyte";
    public static final String OWNER_PASSWORD = "dogru-parola-123";

    @TestConfiguration(proxyBeanMethods = false)
    static class TestConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock();
        }

        @Bean
        CapturingMailSender mailSender() {
            return new CapturingMailSender();
        }
    }

    @BeforeAll
    static void requireDatabase() {
        assumeTrue(TestDatabase.available(),
                "PostgreSQL yok: Docker'ı başlat veya SATIR_TEST_JDBC_URL ayarla");
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        if (TestDatabase.available()) {
            registry.add("spring.datasource.url", TestDatabase::url);
            registry.add("spring.datasource.username", TestDatabase::user);
            registry.add("spring.datasource.password", TestDatabase::password);
        }
    }

    @LocalServerPort
    protected int port;

    @Autowired
    protected JdbcClient jdbc;

    @Autowired
    protected MutableClock clock;

    @Autowired
    protected OwnerBootstrapService ownerBootstrap;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected CapturingMailSender mail;

    @BeforeEach
    void cleanDatabase() {
        // CASCADE also empties every table that references these (articles, series, themes, tokens...).
        jdbc.sql("""
                TRUNCATE app_user, auth_rate_bucket, audit_event, spring_session, idempotency_record, outbox_job,
                    media_asset, cover_job, anonymous_actor CASCADE
                """).update();
        jdbc.sql("INSERT INTO theme_workspace (id, updated_at) VALUES (1, now()) ON CONFLICT (id) DO NOTHING").update();
        jdbc.sql("UPDATE site_settings SET author_public_name = NULL, seo = '{}', indexing_enabled = FALSE, version = 0").update();
        jdbc.sql("DELETE FROM category WHERE slug NOT IN ('yazilim', 'edebiyat', 'kultur')").update();
        clock.reset();
        mail.reset();
    }

    protected ApiClient client() {
        return new ApiClient(port);
    }

    protected UUID createOwner() {
        return ownerBootstrap.bootstrap(OWNER_EMAIL, OWNER_USERNAME, "Mr Byte", OWNER_PASSWORD.toCharArray());
    }

    /** Signed-in owner client with a fresh CSRF token. */
    protected ApiClient ownerClient() {
        ApiClient api = client();
        api.login(OWNER_EMAIL, OWNER_PASSWORD);
        api.refreshCsrf();
        return api;
    }

    /**
     * Members are created directly when a test is not about registration; this mirrors what
     * registration + verification store.
     */
    protected UUID createMember(String email, String password, boolean verified) {
        UUID id = UUID.randomUUID();
        Instant now = clock.instant();
        jdbc.sql("""
                INSERT INTO app_user (id, email, email_normalized, display_name, role, status, verified_at, created_at, updated_at)
                VALUES (:id, :email, :normalized, 'Okur', 'MEMBER', :status, :verifiedAt, :now, :now)
                """)
                .param("id", id)
                .param("email", email)
                .param("normalized", email.toLowerCase())
                .param("status", verified ? "ACTIVE" : "PENDING")
                .param("verifiedAt", verified ? Timestamp.from(now) : null)
                .param("now", Timestamp.from(now))
                .update();
        jdbc.sql("INSERT INTO password_credential (user_id, password_hash, changed_at) VALUES (:id, :hash, :now)")
                .param("id", id)
                .param("hash", passwordEncoder.encode(password))
                .param("now", Timestamp.from(now))
                .update();
        jdbc.sql("INSERT INTO user_preference (user_id) VALUES (:id)").param("id", id).update();
        return id;
    }
}
