package com.satir.identity.api;

import java.io.BufferedReader;
import java.io.Console;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.satir.identity.application.OwnerBootstrapService;
import com.satir.platform.api.ApiException;
import com.satir.platform.validation.ValidationException;

/**
 * Operator command: {@code bootstrap-owner --email=… --username=… --name=… [--password-file=…]}.
 * The password is read from a secret file or stdin, never from command-line arguments or the
 * environment, and is never printed.
 */
@Component
@ConditionalOnProperty(name = "satir.command", havingValue = "bootstrap-owner")
class OwnerBootstrapCommand implements ApplicationRunner, ExitCodeGenerator {

    private static final Logger log = LoggerFactory.getLogger(OwnerBootstrapCommand.class);

    private final OwnerBootstrapService service;
    private int exitCode = 1;

    OwnerBootstrapCommand(OwnerBootstrapService service) {
        this.service = service;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        String email = single(args, "email");
        String username = single(args, "username");
        String name = single(args, "name");
        String passwordFile = args.containsOption("password-file") ? single(args, "password-file") : null;
        if (email == null || username == null || name == null) {
            log.error("Kullanım: bootstrap-owner --email=<e-posta> --username=<kullanıcı-adı> --name=<görünen-ad> [--password-file=<dosya>]");
            return;
        }
        char[] password = passwordFile != null ? readPasswordFile(Path.of(passwordFile)) : readPasswordInteractively();
        if (password == null) {
            return;
        }
        try {
            UUID id = service.bootstrap(email, username, name, password);
            log.info("Site sahibi hesabı oluşturuldu: {}", id);
            exitCode = 0;
        } catch (ValidationException invalid) {
            log.error("Geçersiz alan: {} ({})", invalid.field(), invalid.code());
        } catch (ApiException conflict) {
            log.error("Owner oluşturulamadı: {}", conflict.code());
        } finally {
            Arrays.fill(password, '\0');
        }
    }

    @Override
    public int getExitCode() {
        return exitCode;
    }

    private static String single(ApplicationArguments args, String name) {
        List<String> values = args.getOptionValues(name);
        return values == null || values.size() != 1 ? null : values.getFirst();
    }

    /** Reads the whole file and drops one trailing line break; any other whitespace is kept. */
    private static char[] readPasswordFile(Path file) throws IOException {
        String content = Files.readString(file, StandardCharsets.UTF_8);
        if (content.endsWith("\r\n")) {
            content = content.substring(0, content.length() - 2);
        } else if (content.endsWith("\n")) {
            content = content.substring(0, content.length() - 1);
        }
        return content.toCharArray();
    }

    private static char[] readPasswordInteractively() throws IOException {
        Console console = System.console();
        if (console != null) {
            char[] first = console.readPassword("Owner parolası: ");
            char[] second = console.readPassword("Parolayı tekrar gir: ");
            boolean matches = first != null && Arrays.equals(first, second);
            if (second != null) {
                Arrays.fill(second, '\0');
            }
            if (!matches) {
                log.error("Parolalar eşleşmiyor");
                return null;
            }
            return first;
        }
        // Non-interactive (e.g. piped from a secret manager): first stdin line.
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String line = reader.readLine();
        return line == null ? null : line.toCharArray();
    }
}
