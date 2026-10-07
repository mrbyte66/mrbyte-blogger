package com.satir.identity.infrastructure.security;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;

import com.satir.platform.api.Problems;

import tools.jackson.databind.json.JsonMapper;

/** Security failures rendered in the same problem+json shape as controller errors. */
class ProblemSecurityResponses implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final JsonMapper json;

    ProblemSecurityResponses(JsonMapper json) {
        this.json = json;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
            throws IOException {
        write(response, Problems.of(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Giriş yapman gerekiyor"));
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
            throws IOException {
        ProblemDetail problem;
        if (ex instanceof CsrfException) {
            problem = Problems.of(HttpStatus.FORBIDDEN, "CSRF_INVALID", "Oturum doğrulanamadı; sayfayı yenileyip tekrar dene");
        } else if (isMeEndpoint(request)) {
            problem = Problems.of(HttpStatus.FORBIDDEN, "EMAIL_VERIFICATION_REQUIRED", "Önce e-posta adresini doğrula");
        } else {
            problem = Problems.of(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bu işlem için yetkin yok");
        }
        write(response, problem);
    }

    /** /me rules require only VERIFIED, so a signed-in account denied there is an unverified one. */
    private static boolean isMeEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return path.equals("/api/v1/me") || path.startsWith("/api/v1/me/");
    }

    private void write(HttpServletResponse response, ProblemDetail problem) throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", problem.getType().toString());
        body.put("title", problem.getTitle());
        body.put("status", problem.getStatus());
        if (problem.getProperties() != null) {
            body.putAll(problem.getProperties());
        }
        response.setStatus(problem.getStatus());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(), body);
    }
}
