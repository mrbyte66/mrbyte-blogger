package com.satir.identity.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import com.satir.identity.domain.AccountStatus;
import com.satir.identity.domain.Role;

class AuthoritiesTest {

    @Test
    void verifiedAuthorityRequiresActiveVerifiedAccount() {
        assertThat(names(Role.MEMBER, AccountStatus.ACTIVE, true)).containsExactly("ROLE_MEMBER", "VERIFIED");
        assertThat(names(Role.MEMBER, AccountStatus.PENDING, false)).containsExactly("ROLE_MEMBER");
        assertThat(names(Role.MEMBER, AccountStatus.PENDING, true)).containsExactly("ROLE_MEMBER");
        assertThat(names(Role.OWNER, AccountStatus.ACTIVE, true)).containsExactly("ROLE_OWNER", "VERIFIED");
    }

    @Test
    void sessionLifetimesDependOnRole() {
        SessionPolicy policy = new SessionPolicy(Duration.ofMinutes(30), Duration.ofHours(8), Duration.ofDays(7), Duration.ofDays(30));

        assertThat(policy.idle(Role.OWNER)).isEqualTo(Duration.ofMinutes(30));
        assertThat(policy.absolute(Role.OWNER)).isEqualTo(Duration.ofHours(8));
        assertThat(policy.idle(Role.MEMBER)).isEqualTo(Duration.ofDays(7));
        assertThat(policy.absolute(Role.MEMBER)).isEqualTo(Duration.ofDays(30));
    }

    private static java.util.List<String> names(Role role, AccountStatus status, boolean verified) {
        return Authorities.of(role, status, verified).stream().map(GrantedAuthority::getAuthority).toList();
    }
}
