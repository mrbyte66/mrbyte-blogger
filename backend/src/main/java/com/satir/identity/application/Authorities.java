package com.satir.identity.application;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.satir.identity.domain.AccountStatus;
import com.satir.identity.domain.Role;

/** Server-derived authorities. Clients can never assert a role; it always comes from the account row. */
public final class Authorities {

    public static final String OWNER = "ROLE_OWNER";
    public static final String MEMBER = "ROLE_MEMBER";
    /** Granted only to ACTIVE accounts with a verified e-mail; required by every private /me endpoint. */
    public static final String VERIFIED = "VERIFIED";

    private Authorities() {
    }

    public static List<GrantedAuthority> of(Role role, AccountStatus status, boolean verified) {
        List<GrantedAuthority> authorities = new ArrayList<>(2);
        authorities.add(new SimpleGrantedAuthority(role == Role.OWNER ? OWNER : MEMBER));
        if (status == AccountStatus.ACTIVE && verified) {
            authorities.add(new SimpleGrantedAuthority(VERIFIED));
        }
        return List.copyOf(authorities);
    }
}
