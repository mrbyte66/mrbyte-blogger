package com.satir.identity.application;

import java.util.UUID;

/**
 * Published synchronously inside the account-deletion transaction. Modules that keep personal data
 * (library, reading, engagement) listen and delete it in the same transaction, so a deletion either
 * removes everything or nothing.
 */
public record AccountDeleted(UUID userId) {
}
