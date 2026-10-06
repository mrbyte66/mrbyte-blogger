package com.satir;

import com.satir.editorial.domain.PublicationState;
import com.satir.editorial.domain.ContentDocument;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class PublicationRulesTest {
    private final Instant now=Instant.parse("2026-10-05T12:00:00Z");
    @Test void privateRequiresTwoExplicitOperationsToPublish(){
        var privateDraft=new PublicationState("draft","private",null);
        assertThatThrownBy(()->privateDraft.transition("publish",null,now)).hasMessage("PRIVATE_NOT_PUBLISHABLE");
        var publicDraft=privateDraft.transition("prepare-public",null,now);assertThat(publicDraft.publicReadable()).isFalse();
        assertThat(publicDraft.transition("publish",null,now).publicReadable()).isTrue();
    }
    @Test void restoringPrivateTrashDoesNotPublish(){var restored=new PublicationState("trashed","private",null).transition("restore",null,now);assertThat(restored.visibility()).isEqualTo("private");assertThat(restored.publicReadable()).isFalse();}
    @Test void scheduleMustBeFutureAndLiveContentRequiresExplicitDraft(){
        assertThatThrownBy(()->new PublicationState("draft","public",null).transition("schedule",now,now)).hasMessage("INVALID_SCHEDULE");
        assertThatThrownBy(()->new PublicationState("published","public",null).transition("schedule",now.plusSeconds(1),now)).hasMessage("INVALID_STATE_TRANSITION");
    }
    @Test void unknownFieldsAndDuplicateBlockIdsAreRejected(){
        var id=UUID.randomUUID().toString();var block=Map.<String,Object>of("id",id,"type","paragraph","text","Body");
        new ContentDocument(1,List.of(block)).validate();
        assertThatThrownBy(()->new ContentDocument(1,List.of(block,block)).validate()).hasMessage("INVALID_DOCUMENT");
        assertThatThrownBy(()->new ContentDocument(1,List.of(Map.of("id",id,"type","paragraph","text","Body","html","<script>"))).validate()).hasMessage("INVALID_DOCUMENT");
    }
}
