package com.satir.platform.db;

import java.util.UUID;

import org.springframework.stereotype.Component;

/** Source of new aggregate identifiers, injectable so tests can make IDs deterministic. */
@Component
public class IdGenerator {

    public UUID next() {
        return UUID.randomUUID();
    }
}
