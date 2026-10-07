package com.satir.demo.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.satir.demo.application.DemoSeeder;

/** Operator command {@code seed-demo}: demo content and test members for local development. */
@Component
@ConditionalOnProperty(name = "satir.command", havingValue = "seed-demo")
class DemoSeedCommand implements ApplicationRunner, ExitCodeGenerator {

    private static final Logger log = LoggerFactory.getLogger(DemoSeedCommand.class);

    private final DemoSeeder seeder;
    private int exitCode = 1;

    DemoSeedCommand(DemoSeeder seeder) {
        this.seeder = seeder;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            DemoSeeder.Report report = seeder.seed();
            log.info("Örnek veri yüklendi: {} kategori, {} yazı, {} seri, {} üye eklendi (var olanlara dokunulmadı)",
                    report.categories(), report.articles(), report.series(), report.members());
            exitCode = 0;
        } catch (IllegalStateException refused) {
            log.error("seed-demo çalışmadı: {}", refused.getMessage());
        }
    }

    @Override
    public int getExitCode() {
        return exitCode;
    }
}
