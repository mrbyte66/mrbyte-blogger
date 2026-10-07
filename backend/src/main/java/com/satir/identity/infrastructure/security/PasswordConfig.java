package com.satir.identity.infrastructure.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.satir.identity.infrastructure.PasswordCredentialRepository;
import com.satir.identity.infrastructure.UserAccountRepository;

/**
 * Argon2id hashing. Defaults are the OWASP minimum (19 MiB, 2 iterations, 1 lane); the
 * architecture asks to measure on the VPS and tune towards ~200–500 ms per verification.
 */
@Configuration(proxyBeanMethods = false)
class PasswordConfig {

    @Bean
    PasswordEncoder passwordEncoder(
            @Value("${satir.security.argon2.memory-kib:19456}") int memoryKib,
            @Value("${satir.security.argon2.iterations:2}") int iterations,
            @Value("${satir.security.argon2.parallelism:1}") int parallelism) {
        return new Argon2PasswordEncoder(16, 32, parallelism, memoryKib, iterations);
    }

    @Bean
    AuthenticationManager authenticationManager(UserAccountRepository users, PasswordCredentialRepository credentials,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(new SatirUserDetailsService(users, credentials));
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}
