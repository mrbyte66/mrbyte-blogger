package com.satir.editorial.domain;

import com.satir.platform.ApiException;
import java.time.Instant;

/** A single visibility predicate for all public projections. */
public record PublicationState(String status,String visibility,Instant scheduledAt) {
    public boolean publicReadable(){return status.equals("published")&&visibility.equals("public");}
    public PublicationState transition(String action,Instant at,Instant now) {
        if((action.equals("publish")||action.equals("schedule"))&&visibility.equals("private"))throw new ApiException(409,"PRIVATE_NOT_PUBLISHABLE");
        return switch(action){
            case "publish" -> {requireStatus("draft","scheduled","published");yield new PublicationState("published",visibility,null);}
            case "schedule" -> {requireStatus("draft","scheduled");if(at==null||!at.isAfter(now))throw new ApiException(422,"INVALID_SCHEDULE");yield new PublicationState("scheduled",visibility,at);}
            case "cancel-schedule" -> {requireStatus("scheduled");yield new PublicationState("draft",visibility,null);}
            case "save-draft" -> {requireStatus("draft","scheduled","published");yield new PublicationState("draft",visibility,null);}
            case "archive" -> {requireStatus("draft","scheduled","published","archived");yield new PublicationState("archived",visibility,null);}
            case "trash" -> new PublicationState("trashed",visibility,null);
            case "restore" -> {requireStatus("archived","trashed","draft");yield new PublicationState("draft",visibility,null);}
            case "make-private" -> {requireStatus("draft","scheduled","published","archived");yield new PublicationState("draft","private",null);}
            case "prepare-public" -> {requireStatus("draft");yield new PublicationState("draft","public",null);}
            default -> throw new ApiException(422,"INVALID_ACTION");
        };
    }
    private void requireStatus(String... allowed){if(!java.util.Set.of(allowed).contains(status))throw new ApiException(409,"INVALID_STATE_TRANSITION");}
}
