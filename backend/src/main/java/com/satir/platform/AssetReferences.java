package com.satir.platform;

import java.util.UUID;

/** Reference owners decide visibility; storage never grants public access by possession of a UUID. */
public interface AssetReferences {
    boolean publiclyReferenced(UUID asset);
    boolean referenced(UUID asset);
    boolean privateElsewhere(UUID asset,UUID article);
    boolean publicElsewhere(UUID asset,UUID article);
}
