package com.satir.media.domain;

/**
 * Upload acceptance rules (architecture §6): JPEG/PNG identified by their byte signature, at most
 * 10 MiB and 20 megapixels. SVG/HTML and anything unrecognised is rejected. WebP is listed in the
 * architecture but the JDK has no WebP decoder, so it is refused until a vetted decoder is added.
 */
public final class ImageInspection {

    public static final long MAX_BYTES = 10L * 1024 * 1024;
    public static final long MAX_PIXELS = 20_000_000L;

    public enum Format {
        JPEG("image/jpeg", "jpg", "jpeg"),
        PNG("image/png", "png", "png");

        public final String mime;
        public final String extension;
        public final String imageIoName;

        Format(String mime, String extension, String imageIoName) {
            this.mime = mime;
            this.extension = extension;
            this.imageIoName = imageIoName;
        }
    }

    private ImageInspection() {
    }

    /** Detects the format from magic bytes only; the client-declared content type is ignored. */
    public static Format detect(byte[] head) {
        if (head.length >= 3 && (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF) {
            return Format.JPEG;
        }
        if (head.length >= 8 && (head[0] & 0xFF) == 0x89 && head[1] == 'P' && head[2] == 'N' && head[3] == 'G'
                && head[4] == 0x0D && head[5] == 0x0A && head[6] == 0x1A && head[7] == 0x0A) {
            return Format.PNG;
        }
        return null;
    }

    public static boolean withinPixelLimit(long width, long height) {
        return width > 0 && height > 0 && width * height <= MAX_PIXELS;
    }
}
