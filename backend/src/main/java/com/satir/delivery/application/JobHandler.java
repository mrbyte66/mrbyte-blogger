package com.satir.delivery.application;

import java.util.UUID;
public interface JobHandler {
    String type();
    /** Return false for obsolete work; throws on retryable delivery failure. */
    boolean handle(UUID aggregateId,String deliveryId);
}
