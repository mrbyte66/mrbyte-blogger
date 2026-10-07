package com.satir;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point. Besides serving the API, the same release artifact runs one-shot operator commands:
 *
 * <pre>
 *   java -jar satir-backend.jar migrate
 *   java -jar satir-backend.jar bootstrap-owner --email=... --username=... --name=... [--password-file=...]
 * </pre>
 *
 * Commands start without a web server and exit with a non-zero status on failure.
 */
@SpringBootApplication
@EnableScheduling
public class SatirApplication {

    private static final Set<String> COMMANDS = Set.of("migrate", "bootstrap-owner");

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(SatirApplication.class);
        if (args.length > 0 && COMMANDS.contains(args[0])) {
            String command = args[0];
            app.setWebApplicationType(WebApplicationType.NONE);
            app.setBannerMode(Banner.Mode.OFF);
            // Command-line properties outrank application*.yml, so the command decides the Flyway mode.
            List<String> commandArgs = new ArrayList<>(List.of(
                    "--satir.command=" + command,
                    "--satir.flyway.mode=" + (command.equals("migrate") ? "migrate" : "validate")));
            commandArgs.addAll(Arrays.asList(args).subList(1, args.length));
            System.exit(SpringApplication.exit(app.run(commandArgs.toArray(String[]::new))));
        }
        app.run(args);
    }
}
