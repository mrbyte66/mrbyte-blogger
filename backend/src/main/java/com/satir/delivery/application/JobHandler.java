package com.satir.delivery.application;

import java.util.Map;
import java.util.UUID;

/**
 * Port implemented by business modules for their job types. Delivery decides nothing about
 * publication or accounts: handlers re-check eligibility and return the outcome.
 */
public interface JobHandler {

    String type();

    Outcome handle(Job job);

    record Job(UUID id, String type, UUID aggregateId, long generation, String dedupeKey, Map<String, Object> payload,
            int attempts) {
    }

    sealed interface Outcome {
        record Done() implements Outcome {
        }

        /** No longer eligible (preference off, content hidden, superseded); never retried. */
        record Skipped(String reason) implements Outcome {
        }

        /** Transient failure; retried with backoff until the attempt limit. */
        record Retry(String errorCode) implements Outcome {
        }
    }
}
