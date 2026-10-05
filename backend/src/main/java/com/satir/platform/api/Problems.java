package com.satir.platform.api;

import java.net.URI;
import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

import com.satir.platform.web.RequestIdFilter;

/**
 * Builds {@code application/problem+json} bodies in the contract shape
 * {@code {type,title,status,code,requestId,errors?}}. Never includes stack traces, SQL or secrets.
 */
public final class Problems {

    private Problems() {
    }

    public record FieldError(String field, String code) {
    }

    public static ProblemDetail of(HttpStatusCode status, String code, String title) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setType(URI.create("urn:satir:problem:" + code.toLowerCase(Locale.ROOT).replace('_', '-')));
        problem.setTitle(title);
        problem.setProperty("code", code);
        problem.setProperty("requestId", RequestIdFilter.current());
        return problem;
    }

    public static ProblemDetail validation(List<FieldError> errors) {
        ProblemDetail problem = of(HttpStatusCode.valueOf(422), "VALIDATION_FAILED", "Alanları kontrol et");
        problem.setProperty("errors", errors);
        return problem;
    }
}
