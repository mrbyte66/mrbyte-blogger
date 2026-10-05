package com.satir.identity.domain;

/** PENDING accounts have not verified their e-mail; DELETED rows are identity-free tombstones. */
public enum AccountStatus {
    PENDING,
    ACTIVE,
    DELETED
}
