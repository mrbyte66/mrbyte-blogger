package com.satir.reading.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.satir.editorial.application.EditorialViews.ArticleSummary;
import com.satir.editorial.application.PublicContentQuery;
import com.satir.identity.application.AccountDeleted;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;
import com.satir.platform.validation.ValidationException;
import com.satir.reading.infrastructure.ReadingRepository;

/**
 * Automatic member visit history (API contract §5): the last real opening of each article, never
 * "completed". Entries for articles that are no longer public are returned as unavailable IDs only.
 */
@Service
public class HistoryService {

    /** Visits further in the past than this are rejected instead of silently rewriting history. */
    static final Duration MAX_VISIT_AGE = Duration.ofHours(24);
    /** Product/privacy assumption (architecture §6): personal visit history is kept 180 days. */
    static final Duration RETENTION = Duration.ofDays(180);

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record HistoryItem(UUID articleId, boolean available, ArticleSummary article, Instant lastVisitedAt) {
    }

    public record SeriesVisit(UUID articleId, Instant lastVisitedAt) {
    }

    private final ReadingRepository repository;
    private final PublicContentQuery content;
    private final Clock clock;

    HistoryService(ReadingRepository repository, PublicContentQuery content, Clock clock) {
        this.repository = repository;
        this.content = content;
        this.clock = clock;
    }

    @Transactional
    public void recordVisit(UUID userId, UUID eventId, UUID articleId, UUID revisionId, Instant visitedAt) {
        if (eventId == null) {
            throw new ValidationException("eventId", "REQUIRED");
        }
        if (articleId == null) {
            throw new ValidationException("articleId", "REQUIRED");
        }
        if (revisionId == null) {
            throw new ValidationException("revisionId", "REQUIRED");
        }
        if (content.currentPublicRevision(articleId).isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
        }
        if (content.revisionText(articleId, revisionId).isEmpty()) {
            throw new ValidationException("revisionId", "UNKNOWN_REVISION");
        }
        Instant now = clock.instant();
        // The server clock is the authority: future client times are capped, stale ones refused.
        Instant at = visitedAt == null || visitedAt.isAfter(now) ? now : visitedAt;
        if (at.isBefore(now.minus(MAX_VISIT_AGE))) {
            throw new ValidationException("visitedAt", "OUT_OF_WINDOW");
        }
        repository.recordVisit(userId, articleId, revisionId, at);
    }

    @Transactional(readOnly = true)
    public PageResponse<HistoryItem> history(UUID userId, int page, int size) {
        PageResponse.checkBounds(page, size);
        List<ReadingRepository.HistoryRow> rows = repository.history(userId, page, size);
        Map<UUID, ArticleSummary> visible = content.publicSummaries(rows.stream().map(ReadingRepository.HistoryRow::articleId).toList());
        List<HistoryItem> items = rows.stream().map(row -> {
            ArticleSummary article = visible.get(row.articleId());
            return article == null
                    ? new HistoryItem(row.articleId(), false, null, null)
                    : new HistoryItem(row.articleId(), true, article, row.lastVisitedAt());
        }).toList();
        return PageResponse.of(items, page, size, repository.countHistory(userId), "visited_desc");
    }

    /** Visits of the currently public chapters of a public series, in chapter order. */
    @Transactional(readOnly = true)
    public List<SeriesVisit> seriesHistory(UUID userId, UUID seriesId) {
        List<UUID> chapters = content.publicChapterIds(seriesId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı"));
        Map<UUID, Instant> visits = repository.lastVisits(userId, chapters);
        return chapters.stream().filter(visits::containsKey).map(id -> new SeriesVisit(id, visits.get(id))).toList();
    }

    /** Own last-visit times for the given articles (used by the per-article state endpoint). */
    @Transactional(readOnly = true)
    public Map<UUID, Instant> lastVisits(UUID userId, Collection<UUID> articleIds) {
        return repository.lastVisits(userId, articleIds);
    }

    @Transactional
    public void clear(UUID userId) {
        repository.clearHistory(userId);
    }

    @Scheduled(fixedDelayString = "PT6H", initialDelayString = "PT10M")
    @Transactional
    public void purgeExpired() {
        repository.purgeHistoryBefore(clock.instant().minus(RETENTION));
    }

    /** Runs inside the account-deletion transaction. */
    @EventListener
    public void onAccountDeleted(AccountDeleted event) {
        repository.deleteAll(event.userId());
    }
}
