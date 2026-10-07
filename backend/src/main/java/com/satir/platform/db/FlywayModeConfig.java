package com.satir.platform.db;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The web application validates the schema on start; only the explicit {@code migrate} command
 * (or the dev profile) applies migrations. Unknown modes fail fast.
 */
@Configuration(proxyBeanMethods = false)
class FlywayModeConfig {

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy(@Value("${satir.flyway.mode}") String mode) {
        return switch (mode) {
            case "migrate" -> flyway -> flyway.migrate();
            case "validate" -> flyway -> flyway.validate();
            default -> throw new IllegalStateException("satir.flyway.mode must be validate or migrate");
        };
    }
}
