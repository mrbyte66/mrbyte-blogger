package com.satir.media.application;

import java.util.UUID;

/**
 * Port implemented by the content-owning modules. Media never inspects content tables itself;
 * it asks whether an asset is currently part of something the public may see, or used at all.
 */
public interface MediaReferencePolicy {

    /** True when the asset belongs to currently public content (current revision / public series / applied theme). */
    boolean isPubliclyReferenced(UUID assetId);

    /** True when any revision, series or theme still references the asset (deletion must be refused). */
    boolean isReferenced(UUID assetId);
}
