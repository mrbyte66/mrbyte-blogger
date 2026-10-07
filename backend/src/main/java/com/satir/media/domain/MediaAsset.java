package com.satir.media.domain;

import java.time.Instant;
import java.util.UUID;

/** A stored image and its provenance. The storage key is internal and never exposed publicly. */
public record MediaAsset(UUID id, String storageKey, String state, String mime, Long sizeBytes, Integer width,
        Integer height, String sha256, String sourceProvider, String sourceId, String sourceUrl,
        String photographer, String photographerUrl, String licenseUrl, String errorCode, UUID createdBy,
        Instant createdAt) {
}
