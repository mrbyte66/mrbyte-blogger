package com.satir.demo.api;

import java.nio.file.Path;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.satir.demo.application.DemoSeeder;

/**
 * Operator command {@code seed-demo --file=<seed.json>}: demo content and test members for local development.
 * The seed file is read from disk (repository: {@code deploy/seed/demo.json}); it is not part of the artifact.
 */
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
        List<String> file = args.getOptionValues("file");
        if (file == null || file.size() != 1) {
            log.error("Kullanım: seed-demo --file=<tohum-dosyası> (depoda: deploy/seed/demo.json)");
            return;
        }
        try {
            DemoSeeder.Report report = seeder.seed(Path.of(file.getFirst()));
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
