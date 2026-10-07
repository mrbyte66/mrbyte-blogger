package com.satir.support;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpHeaders;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.atlassian.oai.validator.OpenApiInteractionValidator;
import com.atlassian.oai.validator.model.Request;
import com.atlassian.oai.validator.model.SimpleResponse;
import com.atlassian.oai.validator.report.LevelResolver;
import com.atlassian.oai.validator.report.ValidationReport;

/**
 * Checks every response an integration test receives against {@code docs/openapi.yaml}: the operation and
 * status must be documented and the body must match its schema. Requests are not checked because tests
 * deliberately send invalid ones. A mismatch fails the test that caused it.
 */
public final class OpenApiContract {

    public static final Path SPEC = Path.of("docs/openapi.yaml");

    private static final OpenApiInteractionValidator VALIDATOR = OpenApiInteractionValidator
            .createForSpecificationUrl(SPEC.toAbsolutePath().toUri().toString())
            .withStrictOperationPathMatching()
            .withResolveCombinators(true)
            // Test accounts use the reserved .test domain (RFC 2606), which the e-mail format check rejects.
            .withLevelResolver(LevelResolver.create()
                    .withLevel("validation.response.body.schema.format.email", ValidationReport.Level.IGNORE)
                    .build())
            .build();

    /** Paths tests call on purpose although they are not part of the API: a test-only controller and an unknown path. */
    private static final Set<String> NOT_API = Set.of("/api/v1/studio/test-probe", "/api/v1/unlisted");

    private OpenApiContract() {
    }

    static void checkResponse(String method, URI uri, int status, HttpHeaders headers, byte[] body) {
        if (!uri.getPath().startsWith("/api/") || NOT_API.contains(uri.getPath())) {
            return; // only /api is described
        }
        SimpleResponse.Builder response = SimpleResponse.Builder.status(status);
        headers.map().forEach(response::withHeader);
        if (body.length > 0) {
            response.withBody(body);
        }
        ValidationReport report = VALIDATOR.validateResponse(uri.getPath(),
                Request.Method.valueOf(method.toUpperCase(Locale.ROOT)), response.build());
        if (report.hasErrors()) {
            List<String> problems = new ArrayList<>();
            report.getMessages().stream()
                    .filter(message -> message.getLevel() == ValidationReport.Level.ERROR)
                    .forEach(message -> problems.add(message.getKey() + ": " + message.getMessage()));
            throw new AssertionError("Yanıt docs/openapi.yaml ile uyuşmuyor: " + method + " " + uri.getPath() + " → "
                    + status + "\n  " + String.join("\n  ", problems)
                    + (body.length > 0 && body.length < 2000 ? "\n  gövde: " + new String(body) : ""));
        }
    }

    public static String specText() {
        try {
            return Files.readString(SPEC);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
