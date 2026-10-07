package com.satir.engagement.application;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.application.ArticleStatsSource;
import com.satir.editorial.application.EditorialViews.ArticleStats;
import com.satir.editorial.application.EditorialViews.ArticleTitle;
import com.satir.editorial.application.PublicContentQuery;
import com.satir.editorial.application.StudioContentQuery;
import com.satir.engagement.infrastructure.EngagementRepository;
import com.satir.library.application.LibraryService;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;

/**
 * Aggregate totals (architecture T6): views from the atomic counter, claps and saves counted from
 * their unique relation rows. Public callers only ever receive totals of public articles.
 */
@Service
public class EngagementStats implements ArticleStatsSource {

    public record OwnerArticleStats(UUID articleId, String title, long views, long claps, long saves) {
    }

    private final EngagementRepository repository;
    private final LibraryService library;
    private final PublicContentQuery content;
    private final StudioContentQuery studio;

    EngagementStats(EngagementRepository repository, LibraryService library, PublicContentQuery content,
            StudioContentQuery studio) {
        this.repository = repository;
        this.library = library;
        this.content = content;
        this.studio = studio;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, ArticleStats> stats(Collection<UUID> articleIds) {
        if (articleIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Long> views = repository.viewCounts(articleIds);
        Map<UUID, Long> claps = repository.clapCounts(articleIds);
        Map<UUID, Long> saves = library.saveCounts(articleIds);
        Map<UUID, ArticleStats> result = new HashMap<>();
        for (UUID id : articleIds) {
            result.put(id, new ArticleStats(views.getOrDefault(id, 0L), claps.getOrDefault(id, 0L), saves.getOrDefault(id, 0L)));
        }
        return result;
    }

    /** {@code GET /articles/{id}/stats}: hidden articles are 404, never zero. */
    @Transactional(readOnly = true)
    public ArticleStats publicStats(UUID articleId) {
        if (!content.isArticlePublic(articleId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
        }
        return stats(List.of(articleId)).get(articleId);
    }

    /** Owner's read-only per-article totals (no duration, device or per-reader breakdown). */
    @Transactional(readOnly = true)
    public PageResponse<OwnerArticleStats> ownerStats(int page, int size) {
        PageResponse<ArticleTitle> titles = studio.articleTitles(page, size);
        Map<UUID, ArticleStats> totals = stats(titles.items().stream().map(ArticleTitle::id).toList());
        return titles.map(t -> {
            ArticleStats s = totals.getOrDefault(t.id(), ArticleStats.ZERO);
            return new OwnerArticleStats(t.id(), t.title(), s.views(), s.claps(), s.saves());
        });
    }
}
