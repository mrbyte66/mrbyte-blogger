package com.satir.editorial.domain;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Article body blocks (API contract §2). Plain text only — no HTML, scripts or iframes; the
 * frontend escapes everything. IDs are stable across revisions so private annotations can anchor.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = Block.Paragraph.class, name = "paragraph"),
        @JsonSubTypes.Type(value = Block.Heading.class, name = "heading"),
        @JsonSubTypes.Type(value = Block.Quote.class, name = "quote"),
        @JsonSubTypes.Type(value = Block.Code.class, name = "code"),
        @JsonSubTypes.Type(value = Block.Image.class, name = "image"),
        @JsonSubTypes.Type(value = Block.Table.class, name = "table")})
@JsonInclude(JsonInclude.Include.NON_NULL)
public sealed interface Block {

    UUID id();

    record Paragraph(UUID id, String text) implements Block {
    }

    record Heading(UUID id, String text, Integer level) implements Block {
    }

    record Quote(UUID id, String text, String attribution) implements Block {
    }

    record Code(UUID id, String text, String language, String caption) implements Block {
    }

    /**
     * Either an uploaded media asset ({@code assetId}) or a trusted static site asset shipped with
     * the frontend deployment ({@code staticPath} under {@code /assets/}). Never a free external URL.
     */
    record Image(UUID id, UUID assetId, String staticPath, String alt, String caption, Integer width, Integer height)
            implements Block {
    }

    record Table(UUID id, String caption, List<String> columns, List<List<String>> rows) implements Block {
    }
}
