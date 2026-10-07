package com.satir.identity.api;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.satir.identity.application.GoogleSignIn;
import com.satir.identity.application.MembershipService;
import com.satir.identity.application.ProfileQuery;
import com.satir.identity.application.SatirPrincipal;
import com.satir.identity.application.SessionRegistry;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;

/**
 * The caller's own account (verified accounts only). Identity always comes from the session,
 * never from a path or body; another account's session handle simply is not found.
 */
@RestController
@RequestMapping("/api/v1/me")
class MeController {

    record ProfilePatch(String name, String avatar) {
    }

    record PreferencesPatch(Boolean publicationEmail, String timeZone) {
    }

    record PasswordChange(String password, String passwordConfirmation) {
        @Override
        public String toString() {
            return "PasswordChange[<redacted>]";
        }
    }

    record EmailChange(String email) {
    }

    record ReturnTo(String returnTo) {
    }

    record DeleteRequest(String confirmation) {
    }

    private final ProfileQuery profileQuery;
    private final MembershipService membership;
    private final GoogleSignIn google;
    private final SessionRegistry registry;
    private final SessionSupport sessions;

    MeController(ProfileQuery profileQuery, MembershipService membership, GoogleSignIn google, SessionRegistry registry,
            SessionSupport sessions) {
        this.profileQuery = profileQuery;
        this.membership = membership;
        this.google = google;
        this.registry = registry;
        this.sessions = sessions;
    }

    @GetMapping
    ResponseEntity<ProfileResponse> me(@AuthenticationPrincipal SatirPrincipal principal) {
        return withEtag(profile(principal));
    }

    @PatchMapping
    ResponseEntity<ProfileResponse> updateProfile(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody ProfilePatch body) {
        membership.updateProfile(principal.userId(), Preconditions.requireVersion(ifMatch), body.name(), body.avatar(),
                body.avatar() != null);
        return withEtag(profile(principal));
    }

    @PatchMapping("/preferences")
    ResponseEntity<ProfileResponse> updatePreferences(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody PreferencesPatch body) {
        var current = profileQuery.ownProfile(principal.userId()).orElseThrow(SessionSupport::unauthenticated);
        membership.updatePreferences(principal.userId(), Preconditions.requireVersion(ifMatch), body.publicationEmail(),
                body.timeZone(), current);
        return withEtag(profile(principal));
    }

    @PutMapping("/password")
    ResponseEntity<Void> changePassword(@AuthenticationPrincipal SatirPrincipal principal, @RequestBody PasswordChange body,
            HttpServletRequest request) {
        sessions.requireRecentReauth(request);
        membership.changePassword(principal.userId(), AuthController.chars(body.password()),
                AuthController.chars(body.passwordConfirmation()));
        sessions.endAllSessions(principal.userId(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email-change")
    ResponseEntity<Map<String, String>> requestEmailChange(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestBody EmailChange body, HttpServletRequest request) {
        sessions.requireRecentReauth(request);
        membership.requestEmailChange(principal.userId(), body.email(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("message", "Yeni adresini kontrol et"));
    }

    @GetMapping("/connections")
    Map<String, List<MembershipService.Connection>> connections(@AuthenticationPrincipal SatirPrincipal principal) {
        return Map.of("items", membership.connections(principal.userId()));
    }

    @PostMapping("/connections/google/start")
    Map<String, String> linkGoogle(@AuthenticationPrincipal SatirPrincipal principal, @RequestBody ReturnTo body,
            HttpServletRequest request) {
        sessions.requireRecentReauth(request);
        GoogleSignIn.Start start = google.start(GoogleSignIn.Purpose.LINK, body.returnTo(), principal.userId());
        request.getSession().setAttribute(AuthController.GOOGLE_PENDING, start.pending());
        return Map.of("authorizationUrl", start.authorizationUrl());
    }

    @DeleteMapping("/connections/google")
    ResponseEntity<Void> unlinkGoogle(@AuthenticationPrincipal SatirPrincipal principal, HttpServletRequest request) {
        sessions.requireRecentReauth(request);
        membership.unlinkGoogle(principal.userId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions")
    Map<String, List<SessionRegistry.SessionInfo>> listSessions(@AuthenticationPrincipal SatirPrincipal principal,
            HttpServletRequest request) {
        return Map.of("items", registry.list(principal.userId(), sessions.currentSessionId(request)));
    }

    @DeleteMapping("/sessions/{id}")
    ResponseEntity<Void> revokeSession(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable String id,
            HttpServletRequest request) {
        String current = sessions.currentSessionId(request);
        if (current != null && registry.handle(current).equals(id)) {
            sessions.end(request);
            return ResponseEntity.noContent().build();
        }
        if (!registry.revoke(principal.userId(), id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions/revoke-others")
    ResponseEntity<Void> revokeOthers(@AuthenticationPrincipal SatirPrincipal principal, HttpServletRequest request) {
        sessions.requireRecentReauth(request);
        registry.revokeAllExcept(principal.userId(), sessions.currentSessionId(request));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal SatirPrincipal principal, @RequestBody DeleteRequest body,
            HttpServletRequest request) {
        sessions.requireRecentReauth(request);
        membership.deleteAccount(principal.userId(), body.confirmation());
        sessions.endAllSessions(principal.userId(), request);
        return ResponseEntity.noContent().build();
    }

    private ProfileResponse profile(SatirPrincipal principal) {
        return profileQuery.ownProfile(principal.userId()).map(ProfileResponse::from)
                .orElseThrow(SessionSupport::unauthenticated);
    }

    private static ResponseEntity<ProfileResponse> withEtag(ProfileResponse body) {
        return ResponseEntity.ok().eTag(Preconditions.etag(body.version())).body(body);
    }
}
