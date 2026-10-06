package com.satir.platform;

import java.util.UUID;

/** Each personal-data module deletes only its own records in the account transaction. */
public interface AccountDataRemoval {
    void removeFor(UUID user);
}
