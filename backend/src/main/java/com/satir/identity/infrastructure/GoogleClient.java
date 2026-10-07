package com.satir.identity.infrastructure;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Google OpenID Connect: authorization URL (code + PKCE S256, state, nonce), code exchange and ID
 * token verification (JWKS signature, issuer, audience, expiry). Endpoints are configurable so
 * tests use a local stub; production never calls a hard-coded test host.
 */
@Component
public class GoogleClient {

    public record Identity(String subject, String email, boolean emailVerified, String name, String nonce) {
    }

    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String authorizationUri;
    private final String tokenUri;
    private final List<String> issuers;
    private final JsonMapper json;
    private final NimbusJwtDecoder decoder;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    GoogleClient(@Value("${satir.google.client-id:}") String clientId,
            @Value("${satir.google.client-secret:}") String clientSecret,
            @Value("${satir.google.redirect-uri:${satir.site.public-origin}/api/v1/auth/google/callback}") String redirectUri,
            @Value("${satir.google.authorization-uri:https://accounts.google.com/o/oauth2/v2/auth}") String authorizationUri,
            @Value("${satir.google.token-uri:https://oauth2.googleapis.com/token}") String tokenUri,
            @Value("${satir.google.jwk-set-uri:https://www.googleapis.com/oauth2/v3/certs}") String jwkSetUri,
            @Value("${satir.google.issuers:https://accounts.google.com,accounts.google.com}") List<String> issuers,
            JsonMapper json) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.authorizationUri = authorizationUri;
        this.tokenUri = tokenUri;
        this.issuers = issuers;
        this.json = json;
        this.decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> claims = token -> {
            boolean issuerOk = issuers.contains(token.getClaimAsString("iss"));
            boolean audienceOk = token.getAudience() != null && token.getAudience().contains(clientId);
            return issuerOk && audienceOk ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "issuer/audience mismatch", null));
        };
        this.decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), claims));
    }

    public boolean configured() {
        return !clientId.isBlank() && !clientSecret.isBlank();
    }

    public String authorizationUrl(String state, String nonce, String codeChallenge) {
        return UriComponentsBuilder.fromUriString(authorizationUri)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .queryParam("nonce", nonce)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .queryParam("prompt", "select_account")
                .encode().build().toUriString();
    }

    /** Exchanges the code and returns the verified identity, or empty on any failure. */
    public Optional<Identity> exchange(String code, String codeVerifier) {
        Map<String, String> form = new LinkedHashMap<>();
        form.put("code", code);
        form.put("client_id", clientId);
        form.put("client_secret", clientSecret);
        form.put("redirect_uri", redirectUri);
        form.put("grant_type", "authorization_code");
        form.put("code_verifier", codeVerifier);
        String body = form.entrySet().stream()
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        try {
            HttpResponse<String> response = http.send(HttpRequest.newBuilder(URI.create(tokenUri)).timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return Optional.empty();
            }
            JsonNode tokens = json.readTree(response.body());
            String idToken = tokens.path("id_token").asString();
            if (idToken == null || idToken.isBlank()) {
                return Optional.empty();
            }
            Jwt jwt = decoder.decode(idToken);
            Object verified = jwt.getClaims().get("email_verified");
            return Optional.of(new Identity(jwt.getSubject(), jwt.getClaimAsString("email"),
                    Boolean.TRUE.equals(verified) || "true".equals(verified), jwt.getClaimAsString("name"),
                    jwt.getClaimAsString("nonce")));
        } catch (IOException | JwtException e) {
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

}
