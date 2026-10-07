package com.satir.platform.text;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * URL-safe ASCII slugs. Turkish letters normalize to ASCII (ı→i, ğ→g, ş→s, ç→c, ö→o, ü→u), matching
 * the frontend's slug helper so Studio previews and server results agree.
 */
public final class Slugs {

    public static final int MAX_LENGTH = 100;
    private static final Pattern VALID = Pattern.compile("[a-z0-9]+(-[a-z0-9]+)*");
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern SEPARATORS = Pattern.compile("[^a-z0-9]+");

    private Slugs() {
    }

    public static boolean isValid(String slug) {
        return slug != null && slug.length() <= MAX_LENGTH && VALID.matcher(slug).matches();
    }

    public static String fromTitle(String title) {
        if (title == null) {
            return "";
        }
        String ascii = title.replace('ı', 'i').replace('İ', 'I');
        ascii = MARKS.matcher(Normalizer.normalize(ascii, Normalizer.Form.NFD)).replaceAll("");
        String slug = SEPARATORS.matcher(ascii.toLowerCase(Locale.ROOT)).replaceAll("-");
        slug = slug.replaceAll("^-+|-+$", "");
        if (slug.length() > MAX_LENGTH) {
            slug = slug.substring(0, MAX_LENGTH).replaceAll("-+$", "");
        }
        return slug;
    }
}
