package com.satir.reading.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.satir.engagement.domain.EngagementRules;
import com.satir.library.domain.CollectionName;
import com.satir.platform.validation.ValidationException;
import com.satir.reading.domain.Annotation.Fragment;
import com.satir.reading.domain.Annotation.Kind;

/** Unit rules of slices 6–7: annotation anchors, collection names, event windows and bot filtering. */
class PersonalDataRulesTest {

    private static final String BLOCK = "6f3c9a5e-2b1d-4c7e-9f00-1a2b3c4d5e6f";
    // "🙂" is two UTF-16 code units: offsets must match JavaScript string indices.
    private static final Map<String, String> TEXTS = Map.of(BLOCK, "Merhaba 🙂 dünya", "abstract", "Özet");

    private static String code(Runnable action) {
        try {
            action.run();
            return null;
        } catch (ValidationException e) {
            return e.code();
        }
    }

    @Test
    void quotesUseUtf16OffsetsOfTheAnchoredText() {
        assertThatCode(() -> Annotation.validate(Kind.HIGHLIGHT,
                List.of(new Fragment(BLOCK, 8, 10, "🙂", "Merhaba ", " dünya")), "", TEXTS)).doesNotThrowAnyException();
        assertThat(code(() -> Annotation.validate(Kind.HIGHLIGHT,
                List.of(new Fragment(BLOCK, 8, 9, "🙂", "", "")), "", TEXTS))).isEqualTo("QUOTE_MISMATCH");
        assertThat(code(() -> Annotation.validate(Kind.HIGHLIGHT,
                List.of(new Fragment(BLOCK, 5, 99, "x", "", "")), "", TEXTS))).isEqualTo("RANGE");
        assertThat(code(() -> Annotation.validate(Kind.UNDERLINE,
                List.of(new Fragment("abstract", 0, 4, "Özet", "", "")), "", TEXTS))).isNull();
        assertThat(code(() -> Annotation.validate(Kind.HIGHLIGHT,
                List.of(new Fragment("paragraph-0", 0, 1, "M", "", "")), "", TEXTS))).isEqualTo("FORMAT");
    }

    @Test
    void annotationLimitsAndNoteRule() {
        Fragment ok = new Fragment(BLOCK, 0, 7, "Merhaba", "", "");
        assertThat(code(() -> Annotation.validate(Kind.NOTE, List.of(ok), " ", TEXTS))).isEqualTo("REQUIRED");
        assertThat(code(() -> Annotation.validate(Kind.HIGHLIGHT, List.of(), "", TEXTS))).isEqualTo("REQUIRED");
        assertThat(code(() -> Annotation.validate(Kind.HIGHLIGHT, Collections.nCopies(31, ok), "", TEXTS))).isEqualTo("LENGTH");
        assertThat(code(() -> Annotation.validate(Kind.NOTE, List.of(ok), "n".repeat(4001), TEXTS))).isEqualTo("LENGTH");
        assertThat(code(() -> Annotation.validate(Kind.HIGHLIGHT,
                List.of(new Fragment(BLOCK, 0, 7, "Merhaba", "x".repeat(49), "")), "", TEXTS))).isEqualTo("CONTEXT_LENGTH");
        assertThat(Annotation.kind("note")).isEqualTo(Kind.NOTE);
        assertThat(code(() -> Annotation.kind("sticker"))).isEqualTo("INVALID");
    }

    @Test
    void collectionNamesAreTrimmedAndComparedInTurkish() {
        CollectionName name = CollectionName.of("  İyi   Şiirler ");
        assertThat(name.value()).isEqualTo("İyi Şiirler");
        assertThat(name.normalized()).isEqualTo("iyi şiirler");
        assertThat(CollectionName.of("ILIK").normalized()).isEqualTo("ılık");
        assertThatThrownBy(() -> CollectionName.of("   ")).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> CollectionName.of("x".repeat(61))).isInstanceOf(ValidationException.class);
    }

    @Test
    void eventWindowAndAutomationFilter() {
        Instant now = Instant.parse("2026-10-06T10:00:00Z");
        assertThatCode(() -> EngagementRules.checkWindow(now.minus(Duration.ofHours(23)), now)).doesNotThrowAnyException();
        assertThat(code(() -> EngagementRules.checkWindow(now.minus(Duration.ofHours(25)), now))).isEqualTo("OUT_OF_WINDOW");
        assertThat(code(() -> EngagementRules.checkWindow(now.plus(Duration.ofMinutes(6)), now))).isEqualTo("OUT_OF_WINDOW");
        assertThat(EngagementRules.looksAutomated("Mozilla/5.0 (compatible; Googlebot/2.1)")).isTrue();
        assertThat(EngagementRules.looksAutomated("Mozilla/5.0 HeadlessChrome/140")).isTrue();
        assertThat(EngagementRules.looksAutomated(null)).isTrue();
        assertThat(EngagementRules.looksAutomated("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1")).isFalse();
        assertThat(code(() -> EngagementRules.source("panel"))).isEqualTo("INVALID");
    }
}
