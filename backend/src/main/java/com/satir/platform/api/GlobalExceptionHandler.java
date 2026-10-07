package com.satir.platform.api;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.satir.platform.validation.ValidationException;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.InvalidTypeIdException;
import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.exc.UnrecognizedPropertyException;

/** Maps every failure to the contract's problem+json shape without leaking internals. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final Map<Integer, String[]> GENERIC = Map.ofEntries(
            Map.entry(400, new String[] {"MALFORMED_REQUEST", "İstek okunamadı"}),
            Map.entry(401, new String[] {"UNAUTHENTICATED", "Giriş yapman gerekiyor"}),
            Map.entry(403, new String[] {"FORBIDDEN", "Bu işlem için yetkin yok"}),
            Map.entry(404, new String[] {"NOT_FOUND", "Bulunamadı"}),
            Map.entry(405, new String[] {"METHOD_NOT_ALLOWED", "Bu işlem desteklenmiyor"}),
            Map.entry(406, new String[] {"NOT_ACCEPTABLE", "Yanıt biçimi desteklenmiyor"}),
            Map.entry(413, new String[] {"PAYLOAD_TOO_LARGE", "İstek çok büyük"}),
            Map.entry(415, new String[] {"UNSUPPORTED_MEDIA_TYPE", "İçerik türü desteklenmiyor"}),
            Map.entry(500, new String[] {"INTERNAL_ERROR", "Beklenmeyen bir hata oluştu"}),
            Map.entry(503, new String[] {"SERVICE_UNAVAILABLE", "Hizmet şu anda kullanılamıyor"}));

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> api(ApiException ex) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(ex.status()).contentType(MediaType.APPLICATION_PROBLEM_JSON);
        if (ex.retryAfter() != null) {
            builder.header(HttpHeaders.RETRY_AFTER, Long.toString(Math.max(1, ex.retryAfter().toSeconds())));
        }
        ProblemDetail problem = Problems.of(ex.status(), ex.code(), ex.title());
        ex.extras().forEach(problem::setProperty);
        return builder.body(problem);
    }

    @ExceptionHandler(ValidationException.class)
    ResponseEntity<ProblemDetail> domainInvalid(ValidationException ex) {
        return respond(Problems.validation(List.of(new Problems.FieldError(ex.field(), ex.code()))));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> invalid(MethodArgumentNotValidException ex) {
        List<Problems.FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new Problems.FieldError(error.getField(), validationCode(error.getCode())))
                .toList();
        return respond(Problems.validation(errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> unreadable(HttpMessageNotReadableException ex) {
        for (Throwable cause = ex.getCause(); cause != null; cause = cause.getCause()) {
            if (cause instanceof UnrecognizedPropertyException unknown) {
                return respond(Problems.validation(List.of(new Problems.FieldError(unknown.getPropertyName(), "UNKNOWN_FIELD"))));
            }
            // Well-formed JSON with a wrong shape (unknown block type, string for number, ...) is a 422.
            if (cause instanceof InvalidTypeIdException || cause instanceof MismatchedInputException) {
                String code = cause instanceof InvalidTypeIdException ? "UNKNOWN_TYPE" : "INVALID";
                return respond(Problems.validation(List.of(new Problems.FieldError(path((JacksonException) cause), code))));
            }
        }
        return generic(HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> other(Exception ex) {
        if (ex instanceof ErrorResponse response) {
            return generic(response.getStatusCode());
        }
        log.error("Unhandled request failure", ex);
        return generic(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public static ProblemDetail genericProblem(HttpStatusCode status) {
        String[] codeAndTitle = GENERIC.getOrDefault(status.value(), GENERIC.get(500));
        return Problems.of(status, codeAndTitle[0], codeAndTitle[1]);
    }

    private static ResponseEntity<ProblemDetail> generic(HttpStatusCode status) {
        return respond(genericProblem(status));
    }

    private static ResponseEntity<ProblemDetail> respond(ProblemDetail problem) {
        return ResponseEntity.status(problem.getStatus()).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem);
    }

    /** JSON path like {@code document.blocks[0].type}, without echoing any submitted values. */
    private static String path(JacksonException ex) {
        StringBuilder path = new StringBuilder();
        for (JacksonException.Reference reference : ex.getPath()) {
            if (reference.getPropertyName() != null) {
                if (!path.isEmpty()) {
                    path.append('.');
                }
                path.append(reference.getPropertyName());
            } else if (reference.getIndex() >= 0) {
                path.append('[').append(reference.getIndex()).append(']');
            }
        }
        return path.isEmpty() ? "body" : path.toString();
    }

    private static String validationCode(String constraint) {
        if (constraint == null) {
            return "INVALID";
        }
        return switch (constraint) {
            case "NotNull", "NotBlank", "NotEmpty" -> "REQUIRED";
            case "Size", "Length" -> "LENGTH";
            case "Pattern", "Email" -> "FORMAT";
            default -> "INVALID";
        };
    }
}
