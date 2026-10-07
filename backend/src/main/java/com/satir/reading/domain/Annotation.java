package com.satir.reading.domain;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import com.satir.platform.validation.ValidationException;

/**
 * Rules for a private reading mark (API contract §5). Offsets are UTF-16 code units, exactly like
 * JavaScript strings, and every quote must match the anchored revision's text at those offsets.
 */
public final class Annotation {

    public enum Kind { HIGHLIGHT, UNDERLINE, NOTE }

    /** One contiguous piece of a selection inside a single block (or the abstract). */
    public record Fragment(String blockId, int start, int end, String quote, String before, String after) {
    }

    public static final String ABSTRACT_ANCHOR = "abstract";
    public static final int MAX_FRAGMENTS = 30;
    public static final int MAX_QUOTE_TOTAL = 12_000;
    public static final int MAX_CONTEXT = 48;
    public static final int MAX_NOTE = 4000;
    public static final int MAX_PER_ARTICLE = 200;
    private static final Pattern UUID_TEXT = Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

    private Annotation() {
    }

    public static Kind kind(String raw) {
        if (raw == null) {
            throw new ValidationException("kind", "REQUIRED");
        }
        try {
            return Kind.valueOf(raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ValidationException("kind", "INVALID");
        }
    }

    /**
     * Validates shape and limits, then checks each quote against {@code anchors} (anchor ID → text of
     * the anchored revision). Throws {@link ValidationException} for the first problem found.
     */
    public static void validate(Kind kind, List<Fragment> fragments, String note, Map<String, String> anchors) {
        if (note == null) {
            throw new ValidationException("note", "REQUIRED");
        }
        if (note.length() > MAX_NOTE) {
            throw new ValidationException("note", "LENGTH");
        }
        if (kind == Kind.NOTE && note.isBlank()) {
            throw new ValidationException("note", "REQUIRED");
        }
        if (fragments == null || fragments.isEmpty()) {
            throw new ValidationException("fragments", "REQUIRED");
        }
        if (fragments.size() > MAX_FRAGMENTS) {
            throw new ValidationException("fragments", "LENGTH");
        }
        int total = 0;
        for (int i = 0; i < fragments.size(); i++) {
            Fragment fragment = fragments.get(i);
            String field = "fragments[" + i + "]";
            if (fragment == null || fragment.blockId() == null || fragment.quote() == null) {
                throw new ValidationException(field, "REQUIRED");
            }
            if (!ABSTRACT_ANCHOR.equals(fragment.blockId()) && !UUID_TEXT.matcher(fragment.blockId()).matches()) {
                throw new ValidationException(field + ".blockId", "FORMAT");
            }
            if (length(fragment.before()) > MAX_CONTEXT || length(fragment.after()) > MAX_CONTEXT) {
                throw new ValidationException(field, "CONTEXT_LENGTH");
            }
            String text = anchors.get(fragment.blockId());
            if (text == null) {
                throw new ValidationException(field + ".blockId", "UNKNOWN_ANCHOR");
            }
            if (fragment.start() < 0 || fragment.end() <= fragment.start() || fragment.end() > text.length()) {
                throw new ValidationException(field, "RANGE");
            }
            if (!text.substring(fragment.start(), fragment.end()).equals(fragment.quote())) {
                throw new ValidationException(field + ".quote", "QUOTE_MISMATCH");
            }
            total += fragment.quote().length();
        }
        if (total > MAX_QUOTE_TOTAL) {
            throw new ValidationException("fragments", "LENGTH");
        }
    }

    private static int length(String value) {
        return value == null ? 0 : value.length();
    }
}
