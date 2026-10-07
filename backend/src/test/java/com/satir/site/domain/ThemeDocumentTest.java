package com.satir.site.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.satir.site.domain.ThemeDocument.Block;

class ThemeDocumentTest {

    static ThemeDocument theme(List<Block> blocks) {
        return new ThemeDocument(1, "Açık defter", "SATIR", "mint", "modern", "paper", "reading", "airy", blocks);
    }

    static final Block HEADER = new ThemeDocument.Header("block-header");
    static final Block INTRO = new ThemeDocument.Intro("block-intro", "Merak", "Açıklama", "KOD", "statement");
    static final Block SCENE = new ThemeDocument.Scene("block-scene", "Kod", "Satır", "Açıklama", null, true, null, true);
    static final Block ARTICLES = new ThemeDocument.Articles("block-articles", "Defter", null, "rows", "progressive");
    static final Block FOOTER = new ThemeDocument.Footer("block-footer", "Son");

    @Test
    void acceptsTheStarterLayouts() {
        theme(List.of(SCENE)).validatedForApply();
        theme(List.of(HEADER, INTRO, ARTICLES, FOOTER)).validatedForApply();
    }

    @Test
    void enforcesPlacementRules() {
        assertThatThrownBy(() -> theme(List.of(ARTICLES, HEADER)).validated()).extracting("code").isEqualTo("PLACEMENT");
        assertThatThrownBy(() -> theme(List.of(FOOTER, ARTICLES)).validated()).extracting("code").isEqualTo("PLACEMENT");
        assertThatThrownBy(() -> theme(List.of(HEADER, ARTICLES, INTRO)).validated()).extracting("code").isEqualTo("PLACEMENT");
        assertThatThrownBy(() -> theme(List.of(INTRO, SCENE)).validated()).extracting("code").isEqualTo("PLACEMENT");
        assertThatThrownBy(() -> theme(List.of(ARTICLES, ARTICLES)).validated()).extracting("code").isEqualTo("DUPLICATE");
    }

    @Test
    void draftsMayBeEmptyButApplyNeedsContent() {
        theme(List.of()).validated();
        assertThatThrownBy(() -> theme(List.of(HEADER, FOOTER)).validatedForApply()).extracting("code").isEqualTo("CONTENT_REQUIRED");
        assertThatThrownBy(() -> new ThemeDocument(1, " ", "SATIR", "mint", "modern", "paper", "reading", "airy", List.of(SCENE))
                .validatedForApply()).extracting("field").isEqualTo("name");
    }

    @Test
    void rejectsUnknownAppearanceValues() {
        assertThatThrownBy(() -> new ThemeDocument(1, "a", "b", "red", "modern", "paper", "reading", "airy", List.of()).validated())
                .extracting("field").isEqualTo("accent");
        assertThatThrownBy(() -> new ThemeDocument(1, "a", "b", "#aabbcc", "comic", "paper", "reading", "airy", List.of()).validated())
                .extracting("field").isEqualTo("typography");
        assertThat(new ThemeDocument(1, "a", "b", "#AABBCC", "mono", "night", "wide", "compact", List.of()).validated()).isNotNull();
    }
}
