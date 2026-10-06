package com.satir.editorial.domain;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import com.satir.platform.validation.ValidationException;

/** Versioned article body. Validation mirrors the limits in API contract §2. */
public record ArticleDocument(Integer schemaVersion, List<Block> blocks) {

    public static final int MAX_BLOCKS = 500;
    private static final Set<String> CODE_LANGUAGES = Set.of("plain", "java", "javascript", "typescript", "python",
            "bash", "sql", "json", "yaml", "html", "css", "kotlin", "go", "rust", "csharp", "cpp");
    private static final Pattern STATIC_PATH = Pattern.compile("/assets/[a-zA-Z0-9._/-]{1,200}");
    private static final Pattern SENTENCE = Pattern.compile("[^.!?…]+(?:[.!?…]+(?=\\s|$)|$)");

    public static ArticleDocument empty() {
        return new ArticleDocument(1, List.of());
    }

    /** Throws {@link ValidationException} for the first structural problem. */
    public ArticleDocument validated() {
        if (schemaVersion == null || schemaVersion != 1) {
            throw new ValidationException("document.schemaVersion", "UNSUPPORTED");
        }
        if (blocks == null) {
            throw new ValidationException("document.blocks", "REQUIRED");
        }
        if (blocks.size() > MAX_BLOCKS) {
            throw new ValidationException("document.blocks", "LENGTH");
        }
        Set<UUID> ids = new HashSet<>();
        for (int i = 0; i < blocks.size(); i++) {
            Block block = blocks.get(i);
            String field = "document.blocks[" + i + "]";
            if (block == null || block.id() == null) {
                throw new ValidationException(field + ".id", "REQUIRED");
            }
            if (!ids.add(block.id())) {
                throw new ValidationException(field + ".id", "DUPLICATE");
            }
            validateBlock(field, block);
        }
        return this;
    }

    private static void validateBlock(String field, Block block) {
        switch (block) {
            case Block.Paragraph p -> text(field + ".text", p.text(), 0, 20_000);
            case Block.Heading h -> {
                text(field + ".text", h.text(), 1, 300);
                if (h.level() == null || (h.level() != 2 && h.level() != 3)) {
                    throw new ValidationException(field + ".level", "INVALID");
                }
            }
            case Block.Quote q -> {
                text(field + ".text", q.text(), 1, 4000);
                optionalText(field + ".attribution", q.attribution(), 200);
            }
            case Block.Code c -> {
                text(field + ".text", c.text(), 0, 50_000);
                if (c.language() != null && !CODE_LANGUAGES.contains(c.language())) {
                    throw new ValidationException(field + ".language", "INVALID");
                }
                optionalText(field + ".caption", c.caption(), 300);
            }
            case Block.Image img -> {
                if ((img.assetId() == null) == (img.staticPath() == null)) {
                    throw new ValidationException(field + ".assetId", "REQUIRED");
                }
                if (img.staticPath() != null && (!STATIC_PATH.matcher(img.staticPath()).matches() || img.staticPath().contains(".."))) {
                    throw new ValidationException(field + ".staticPath", "FORMAT");
                }
                optionalText(field + ".alt", img.alt(), 500);
                optionalText(field + ".caption", img.caption(), 1000);
                if ((img.width() != null && img.width() <= 0) || (img.height() != null && img.height() <= 0)) {
                    throw new ValidationException(field + ".width", "INVALID");
                }
            }
            case Block.Table t -> {
                optionalText(field + ".caption", t.caption(), 300);
                if (t.columns() == null || t.columns().isEmpty() || t.columns().size() > 20) {
                    throw new ValidationException(field + ".columns", "LENGTH");
                }
                t.columns().forEach(column -> text(field + ".columns", column, 0, 200));
                if (t.rows() == null || t.rows().size() > 200) {
                    throw new ValidationException(field + ".rows", "LENGTH");
                }
                for (List<String> row : t.rows()) {
                    if (row == null || row.size() != t.columns().size()) {
                        throw new ValidationException(field + ".rows", "COLUMN_COUNT");
                    }
                    row.forEach(cell -> text(field + ".rows", cell, 0, 2000));
                }
            }
        }
    }

    public boolean hasNonBlankParagraph() {
        return blocks.stream().anyMatch(b -> b instanceof Block.Paragraph p && p.text() != null && !p.text().isBlank());
    }

    public List<UUID> assetIds() {
        return blocks.stream()
                .filter(b -> b instanceof Block.Image i && i.assetId() != null)
                .map(b -> ((Block.Image) b).assetId())
                .toList();
    }

    /** Text of every block a reader can annotate, keyed by stable block ID (UTF-16 offsets apply). */
    public java.util.Map<UUID, String> annotatableTexts() {
        java.util.Map<UUID, String> texts = new java.util.HashMap<>();
        for (Block block : blocks) {
            String text = switch (block) {
                case Block.Paragraph p -> p.text();
                case Block.Heading h -> h.text();
                case Block.Quote q -> q.text();
                case Block.Code c -> c.text();
                default -> null;
            };
            if (text != null) {
                texts.put(block.id(), text);
            }
        }
        return texts;
    }

    /** Server-derived reading time: 200 words per minute, at least one minute. */
    public int readingMinutes() {
        long words = 0;
        for (Block block : blocks) {
            String text = switch (block) {
                case Block.Paragraph p -> p.text();
                case Block.Heading h -> h.text();
                case Block.Quote q -> q.text();
                default -> null;
            };
            if (text != null && !text.isBlank()) {
                words += text.strip().split("\\s+").length;
            }
        }
        return (int) Math.max(1, Math.min(240, Math.ceil(words / 200.0)));
    }

    /** Body preview: whole sentences until ~200 characters (same rule as the prototype). */
    public String bodyPreview(int maxLength) {
        List<String> paragraphs = new ArrayList<>();
        for (Block block : blocks) {
            if (block instanceof Block.Paragraph p && p.text() != null) {
                paragraphs.add(p.text());
            }
        }
        String body = String.join(" ", paragraphs).replaceAll("\\s+", " ").strip();
        if (body.length() <= maxLength) {
            return body;
        }
        StringBuilder preview = new StringBuilder();
        var matcher = SENTENCE.matcher(body);
        while (matcher.find()) {
            String sentence = matcher.group().strip();
            if (sentence.isEmpty()) {
                continue;
            }
            if (!preview.isEmpty()) {
                preview.append(' ');
            }
            preview.append(sentence);
            if (preview.length() >= maxLength) {
                break;
            }
        }
        return preview.length() > 2000 ? preview.substring(0, 2000) : preview.toString();
    }

    private static void text(String field, String value, int min, int max) {
        if (value == null) {
            throw new ValidationException(field, "REQUIRED");
        }
        int length = value.codePointCount(0, value.length());
        if (length < min || length > max || (min > 0 && value.isBlank())) {
            throw new ValidationException(field, min > 0 && value.isBlank() ? "REQUIRED" : "LENGTH");
        }
    }

    private static void optionalText(String field, String value, int max) {
        if (value != null && value.codePointCount(0, value.length()) > max) {
            throw new ValidationException(field, "LENGTH");
        }
    }
}
