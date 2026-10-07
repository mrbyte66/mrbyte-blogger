package com.satir.identity.api;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.satir.identity.application.AccountAccess;
import com.satir.identity.application.GoogleSignIn;
import com.satir.identity.application.LoginService;
import com.satir.identity.application.MembershipService;
import com.satir.identity.application.ProfileQuery;
import com.satir.platform.api.ApiException;
import com.satir.platform.audit.AuditLog;

/**
 * Session and account-recovery endpoints (API contract §4). Public account endpoints always answer
 * 202 so they never reveal whether an address is registered. Passwords and tokens are never logged.
 */
@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

    static final String GOOGLE_PENDING = "satir.google.pending";

    record CsrfResponse(String token, String headerName) {
    }

    record LoginRequest(@NotBlank @Size(max = 254) String identifier, @NotBlank @Size(max = 1024) String password) {
        @Override
        public String toString() {
            return "LoginRequest[<redacted>]";
        }
    }

    record RegisterRequest(String name, String email, String password, String passwordConfirmation) {
        @Override
        public String toString() {
            return "RegisterRequest[<redacted>]";
        }
    }

    record EmailRequest(String email) {
    }

    record TokenRequest(String token) {
        @Override
        public String toString() {
            return "TokenRequest[<redacted>]";
        }
    }

    record ResetRequest(String token, String password, String passwordConfirmation) {
        @Override
        public String toString() {
            return "ResetRequest[<redacted>]";
        }
    }

    record ReauthRequest(String password) {
        @Override
        public String toString() {
            return "ReauthRequest[<redacted>]";
        }
    }

    record GoogleStartRequest(String returnTo, String purpose) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record SessionResponse(boolean authenticated, ProfileResponse profile, Instant expiresAt) {
        static SessionResponse anonymous() {
            return new SessionResponse(false, null, null);
        }
    }

    private static final Map<String, String> ACCEPTED = Map.of("message", "E-postanı kontrol et");

    private final LoginService loginService;
    private final MembershipService membership;
    private final GoogleSignIn google;
    private final ProfileQuery profileQuery;
    private final SessionSupport sessions;
    private final AuditLog audit;

    AuthController(LoginService loginService, MembershipService membership, GoogleSignIn google, ProfileQuery profileQuery,
            SessionSupport sessions, AuditLog audit) {
        this.loginService = loginService;
        this.membership = membership;
        this.google = google;
        this.profileQuery = profileQuery;
        this.sessions = sessions;
        this.audit = audit;
    }

    /** Bootstraps (or re-reads) the CSRF token; may create an anonymous session. */
    @GetMapping("/csrf")
    CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getToken(), token.getHeaderName());
    }

    @PostMapping("/login")
    ProfileResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        AccountAccess.Grant grant = loginService.login(body.identifier(), body.password(), request.getRemoteAddr());
        sessions.establish(grant, request, response);
        return profileQuery.ownProfile(grant.userId()).map(ProfileResponse::from).orElseThrow(SessionSupport::unauthenticated);
    }

    @GetMapping("/session")
    SessionResponse session(HttpServletRequest request) {
        return sessions.currentPrincipal()
                .flatMap(principal -> profileQuery.ownProfile(principal.userId()))
                .map(profile -> new SessionResponse(true, ProfileResponse.from(profile), sessions.expiresAt(request).orElse(null)))
                .orElseGet(SessionResponse::anonymous);
    }

    /** Activity already renews the idle deadline; this never extends the absolute deadline. */
    @PostMapping("/session/renew")
    SessionResponse renew(HttpServletRequest request) {
        SessionResponse current = session(request);
        if (!current.authenticated()) {
            throw SessionSupport.unauthenticated();
        }
        return current;
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest request) {
        sessions.currentPrincipal().ifPresent(principal ->
                audit.record(principal.userId(), "LOGOUT", "USER", principal.userId(), AuditLog.Outcome.SUCCESS));
        sessions.end(request);
        return ResponseEntity.noContent().build();
    }

    // ---------------------------------------------------------------- registration & recovery

    @PostMapping("/register")
    ResponseEntity<Map<String, String>> register(@RequestBody RegisterRequest body, HttpServletRequest request) {
        membership.register(body.name(), body.email(), chars(body.password()), chars(body.passwordConfirmation()),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ACCEPTED);
    }

    @PostMapping("/verification/resend")
    ResponseEntity<Map<String, String>> resend(@RequestBody EmailRequest body, HttpServletRequest request) {
        membership.resendVerification(body.email(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ACCEPTED);
    }

    @PostMapping("/verification/confirm")
    ResponseEntity<Void> confirm(@RequestBody TokenRequest body) {
        membership.confirmVerification(body.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/forgot")
    ResponseEntity<Map<String, String>> forgot(@RequestBody EmailRequest body, HttpServletRequest request) {
        membership.forgotPassword(body.email(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ACCEPTED);
    }

    @PostMapping("/password/reset")
    ResponseEntity<Void> reset(@RequestBody ResetRequest body, HttpServletRequest request) {
        var userId = membership.resetPassword(body.token(), chars(body.password()), chars(body.passwordConfirmation()));
        sessions.endAllSessions(userId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email-change/confirm")
    ResponseEntity<Void> confirmEmailChange(@RequestBody TokenRequest body, HttpServletRequest request) {
        var userId = membership.confirmEmailChange(body.token());
        sessions.endAllSessions(userId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reauthenticate")
    Map<String, Instant> reauthenticate(@RequestBody ReauthRequest body, HttpServletRequest request) {
        var principal = sessions.requireVerified();
        membership.verifyPassword(principal.userId(), body.password());
        return Map.of("validUntil", sessions.markReauthenticated(request));
    }

    // ---------------------------------------------------------------- Google

    @PostMapping("/google/start")
    Map<String, String> googleStart(@RequestBody GoogleStartRequest body, HttpServletRequest request) {
        GoogleSignIn.Purpose purpose = "reauth".equals(body.purpose()) ? GoogleSignIn.Purpose.REAUTH : GoogleSignIn.Purpose.LOGIN;
        if (body.purpose() != null && !"login".equals(body.purpose()) && !"reauth".equals(body.purpose())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "VALIDATION_FAILED", "Alanları kontrol et");
        }
        var current = purpose == GoogleSignIn.Purpose.REAUTH ? sessions.requireVerified().userId() : null;
        GoogleSignIn.Start start = google.start(purpose, body.returnTo(), current);
        request.getSession(true).setAttribute(GOOGLE_PENDING, start.pending());
        return Map.of("authorizationUrl", start.authorizationUrl());
    }

    /** Provider redirect target. Always answers 303 to an allowlisted same-origin path. */
    @GetMapping("/google/callback")
    void googleCallback(@RequestParam(required = false) String state, @RequestParam(required = false) String code,
            @RequestParam(required = false) String error, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        HttpSession session = request.getSession(false);
        GoogleSignIn.Pending pending = session != null && session.getAttribute(GOOGLE_PENDING) instanceof GoogleSignIn.Pending p ? p : null;
        if (session != null) {
            session.removeAttribute(GOOGLE_PENDING);
        }
        String returnTo = pending == null ? "/" : pending.returnTo();
        String outcome;
        if (error != null) {
            outcome = "google_error=google_cancelled";
        } else {
            var current = sessions.currentPrincipal().map(p -> p.userId()).orElse(null);
            GoogleSignIn.Result result = google.complete(pending, state, code, current);
            outcome = switch (result) {
                case GoogleSignIn.Result.SignedIn signedIn -> {
                    sessions.establish(signedIn.grant(), request, response);
                    yield "google=signed_in";
                }
                case GoogleSignIn.Result.Linked linked -> "google=linked";
                case GoogleSignIn.Result.Reauthenticated reauthenticated -> {
                    sessions.markReauthenticated(request);
                    yield "google=reauthenticated";
                }
                case GoogleSignIn.Result.Failed failed -> "google_error=" + failed.code();
            };
        }
        response.setStatus(HttpStatus.SEE_OTHER.value());
        response.setHeader("Location", returnTo + (returnTo.contains("?") ? "&" : "?") + outcome);
        response.setHeader("Referrer-Policy", "no-referrer");
    }

    static char[] chars(String value) {
        return value == null ? null : value.toCharArray();
    }
}
