package com.satir.platform;

import javax.sql.DataSource;
import java.time.Clock;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseConfiguration {
    @Bean org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() { return new org.springframework.security.crypto.argon2.Argon2PasswordEncoder(16,32,1,65536,3); }
    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean Flyway flyway(DataSource dataSource, @Value("${satir.migration-mode}") String mode) {
        var flyway = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").cleanDisabled(true).load();
        if (mode.equals("migrate")) flyway.migrate();
        else if (mode.equals("validate")) {
            flyway.validate();
            if (flyway.info().pending().length != 0) throw new IllegalStateException("Pending migrations: run the migration command before starting the application");
        } else throw new IllegalArgumentException("Unknown migration mode");
        return flyway;
    }
}
