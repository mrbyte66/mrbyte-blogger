package com.satir.site.domain;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.satir.platform.validation.ValidationException;

/**
 * Site theme (API contract §2): the allowlisted block kinds and properties of the frontend builder.
 * Content references are UUIDs, never slugs. No raw HTML/CSS/JS anywhere.
 */
public record ThemeDocument(Integer schemaVersion, String name, String siteName, String accent, String typography,
        String surface, String width, String spacing, List<Block> blocks) {

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
    @JsonSubTypes({
            @JsonSubTypes.Type(value = Header.class, name = "header"),
            @JsonSubTypes.Type(value = Intro.class, name = "intro"),
            @JsonSubTypes.Type(value = Scene.class, name = "scene"),
            @JsonSubTypes.Type(value = Articles.class, name = "articles"),
            @JsonSubTypes.Type(value = Series.class, name = "series"),
            @JsonSubTypes.Type(value = Quote.class, name = "quote"),
            @JsonSubTypes.Type(value = About.class, name = "about"),
            @JsonSubTypes.Type(value = Projects.class, name = "projects"),
            @JsonSubTypes.Type(value = Footer.class, name = "footer")})
    public sealed interface Block {
        String id();
    }

    public record Header(String id) implements Block {
    }

    public record Intro(String id, String title, String description, String eyebrow, String layout) implements Block {
    }

    public record Scene(String id, String title, String emphasis, String description, UUID featuredArticleId,
            boolean showFeaturedArticle, UUID featuredSeriesId, boolean showFeaturedSeries) implements Block {

        public Scene withBindings(UUID article, UUID series) {
            return new Scene(id, title, emphasis, description, article, showFeaturedArticle, series, showFeaturedSeries);
        }
    }

    public record Articles(String id, String title, UUID categoryId, String display, String loading) implements Block {
    }

    public record Series(String id, String title, String display) implements Block {
    }

    public record Quote(String id, String text, String attribution, String display) implements Block {
    }

    public record About(String id, String title, String text) implements Block {
    }

    public record Projects(String id, String title) implements Block {
    }

    public record Footer(String id, String text) implements Block {
    }

    private static final Pattern BLOCK_ID = Pattern.compile("[a-zA-Z0-9-]{1,80}");
    private static final Pattern HEX = Pattern.compile("#[0-9a-fA-F]{6}");
    private static final Set<String> LEGACY_ACCENTS = Set.of("mint", "violet", "amber");

    /** Structural rules that also hold for drafts (which may be empty). */
    public ThemeDocument validated() {
        if (schemaVersion == null || schemaVersion != 1) {
            throw new ValidationException("schemaVersion", "UNSUPPORTED");
        }
        text("name", name, 80);
        text("siteName", siteName, 40);
        if (accent == null || !(LEGACY_ACCENTS.contains(accent) || HEX.matcher(accent).matches())) {
            throw new ValidationException("accent", "INVALID");
        }
        oneOf("typography", typography, "modern", "editorial", "mono");
        oneOf("surface", surface, "paper", "night", "warm");
        oneOf("width", width, "reading", "wide");
        oneOf("spacing", spacing, "airy", "compact");
        if (blocks == null || blocks.size() > 9) {
            throw new ValidationException("blocks", "LENGTH");
        }
        Set<String> ids = new HashSet<>();
        Set<Class<?>> kinds = new HashSet<>();
        for (int i = 0; i < blocks.size(); i++) {
            Block block = blocks.get(i);
            String field = "blocks[" + i + "]";
            if (block == null || block.id() == null || !BLOCK_ID.matcher(block.id()).matches()) {
                throw new ValidationException(field + ".id", "FORMAT");
            }
            if (!ids.add(block.id()) || !kinds.add(block.getClass())) {
                throw new ValidationException(field, "DUPLICATE");
            }
            validateBlock(field, block);
        }
        if (!placementValid()) {
            throw new ValidationException("blocks", "PLACEMENT");
        }
        return this;
    }

    /** Additional rules before a draft can become the public theme. */
    public ThemeDocument validatedForApply() {
        validated();
        if (name.isBlank()) {
            throw new ValidationException("name", "REQUIRED");
        }
        if (siteName.isBlank()) {
            throw new ValidationException("siteName", "REQUIRED");
        }
        if (blocks.stream().noneMatch(b -> !(b instanceof Header) && !(b instanceof Footer))) {
            throw new ValidationException("blocks", "CONTENT_REQUIRED");
        }
        return this;
    }

    public ThemeDocument withBlocks(List<Block> next) {
        return new ThemeDocument(schemaVersion, name, siteName, accent, typography, surface, width, spacing, next);
    }

    /** Header first, a single lead (intro XOR scene) directly after it, footer last. */
    private boolean placementValid() {
        int leadStart = !blocks.isEmpty() && blocks.getFirst() instanceof Header ? 1 : 0;
        List<Integer> leads = new ArrayList<>();
        for (int i = 0; i < blocks.size(); i++) {
            Block block = blocks.get(i);
            if (block instanceof Header && i != 0) {
                return false;
            }
            if (block instanceof Footer && i != blocks.size() - 1) {
                return false;
            }
            if (block instanceof Intro || block instanceof Scene) {
                leads.add(i);
            }
        }
        return leads.size() <= 1 && leads.stream().allMatch(i -> i == leadStart);
    }

    private static void validateBlock(String field, Block block) {
        switch (block) {
            case Header h -> {
            }
            case Intro b -> {
                text(field + ".title", b.title(), 160);
                text(field + ".description", b.description(), 4000);
                text(field + ".eyebrow", b.eyebrow(), 120);
                oneOf(field + ".layout", b.layout(), "statement", "centered", "split");
            }
            case Scene b -> {
                text(field + ".title", b.title(), 160);
                text(field + ".emphasis", b.emphasis(), 160);
                text(field + ".description", b.description(), 4000);
            }
            case Articles b -> {
                text(field + ".title", b.title(), 160);
                oneOf(field + ".display", b.display(), "rows", "cards");
                oneOf(field + ".loading", b.loading(), "all", "progressive");
            }
            case Series b -> {
                text(field + ".title", b.title(), 160);
                oneOf(field + ".display", b.display(), "cards", "list");
            }
            case Quote b -> {
                text(field + ".text", b.text(), 8000);
                text(field + ".attribution", b.attribution(), 120);
                oneOf(field + ".display", b.display(), "band", "card");
            }
            case About b -> {
                text(field + ".title", b.title(), 160);
                text(field + ".text", b.text(), 8000);
            }
            case Projects b -> text(field + ".title", b.title(), 160);
            case Footer b -> text(field + ".text", b.text(), 160);
        }
    }

    private static void text(String field, String value, int max) {
        if (value == null) {
            throw new ValidationException(field, "REQUIRED");
        }
        if (value.codePointCount(0, value.length()) > max) {
            throw new ValidationException(field, "LENGTH");
        }
    }

    private static void oneOf(String field, String value, String... allowed) {
        for (String option : allowed) {
            if (option.equals(value)) {
                return;
            }
        }
        throw new ValidationException(field, "INVALID");
    }
}
