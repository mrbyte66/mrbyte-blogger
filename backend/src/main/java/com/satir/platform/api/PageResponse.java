package com.satir.platform.api;

import java.util.List;
import java.util.function.Function;

import org.springframework.http.HttpStatus;

/** Contract list shape: {@code {items,page,size,totalElements,totalPages,sort}}. */
public record PageResponse<T>(List<T> items, int page, int size, long totalElements, int totalPages, String sort) {

    public static final int MAX_SIZE = 50;
    public static final int MAX_PAGE = 1000;

    public static <T> PageResponse<T> of(List<T> items, int page, int size, long total, String sort) {
        return new PageResponse<>(items, page, size, total, (int) Math.ceil(total / (double) size), sort);
    }

    public <R> PageResponse<R> map(Function<T, R> mapper) {
        return new PageResponse<>(items.stream().map(mapper).toList(), page, size, totalElements, totalPages, sort);
    }

    public static void checkBounds(int page, int size) {
        if (page < 0 || page > MAX_PAGE || size < 1 || size > MAX_SIZE) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_PAGE", "Sayfa parametreleri geçersiz");
        }
    }

    /** Normalizes a free-text search parameter: trimmed, 1–100 characters, otherwise absent. */
    public static String query(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        String trimmed = q.strip();
        if (trimmed.length() > 100) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_QUERY", "Arama en fazla 100 karakter olabilir");
        }
        return trimmed;
    }
}
