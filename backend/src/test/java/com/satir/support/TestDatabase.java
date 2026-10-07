package com.satir.support;

import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real PostgreSQL for integration tests — never H2. Uses Testcontainers when Docker is available.
 * Without Docker, set SATIR_TEST_JDBC_URL / SATIR_TEST_DB_USER / SATIR_TEST_DB_PASSWORD to a
 * disposable database of the same major version (its tables are truncated by the tests).
 * If neither is available, integration tests are skipped (reported, not silently passed).
 */
public final class TestDatabase {

    private static final String IMAGE = "postgres:18.4-alpine";

    private static final String url;
    private static final String user;
    private static final String password;

    static {
        String externalUrl = System.getenv("SATIR_TEST_JDBC_URL");
        if (externalUrl != null && !externalUrl.isBlank()) {
            url = externalUrl;
            user = System.getenv().getOrDefault("SATIR_TEST_DB_USER", "satir");
            password = System.getenv().getOrDefault("SATIR_TEST_DB_PASSWORD", "");
        } else if (dockerAvailable()) {
            PostgreSQLContainer container = new PostgreSQLContainer(IMAGE)
                    .withDatabaseName("satir_test")
                    .withUsername("satir")
                    .withPassword("satir-test");
            container.start();
            url = container.getJdbcUrl();
            user = container.getUsername();
            password = container.getPassword();
        } else {
            url = null;
            user = null;
            password = null;
        }
    }

    private TestDatabase() {
    }

    public static boolean available() {
        return url != null;
    }

    public static String url() {
        return url;
    }

    public static String user() {
        return user;
    }

    public static String password() {
        return password;
    }

    private static boolean dockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (RuntimeException unavailable) {
            return false;
        }
    }
}
