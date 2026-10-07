package com.satir.identity.application;

import java.io.Serializable;
import java.security.Principal;
import java.util.UUID;

/**
 * The only identity stored in the server session: the account ID. Role, verification and status
 * are re-read from the database on every request, so a stale session never keeps old rights.
 */
public record SatirPrincipal(UUID userId) implements Principal, Serializable {

    @Override
    public String getName() {
        return userId.toString();
    }
}
