package com.satir.library.application;

import java.text.Collator;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.satir.editorial.application.EditorialViews.ArticleSummary;
import com.satir.editorial.application.EditorialViews.CategoryView;
import com.satir.editorial.application.PublicContentQuery;
import com.satir.identity.application.AccountDeleted;
import com.satir.library.domain.CollectionName;
import com.satir.library.infrastructure.LibraryRepository;
import com.satir.library.infrastructure.LibraryRepository.BookmarkRow;
import com.satir.library.infrastructure.LibraryRepository.CollectionRow;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;
import com.satir.platform.db.IdGenerator;
import com.satir.reading.application.HistoryService;

/**
 * Private member library (API contract §5): collections with an immutable default "Genel" and one
 * bookmark per article. Moving a bookmark never changes its saved time; deleting a collection moves
 * its bookmarks to "Genel". Saved articles that are no longer public stay listed as unavailable,
 * without title or other metadata, so the member can remove them.
 */
@Service
public class LibraryService {

    /** Smallest safe limits (not in the contract); recorded in backend README. */
    public static final int MAX_COLLECTIONS = 100;
    public static final int MAX_BOOKMARKS = 1000;
    private static final Set<String> SORTS = Set.of("saved_asc", "saved_desc", "date_desc", "title_asc");
    private static final Locale TURKISH = Locale.forLanguageTag("tr");

    public record CollectionView(UUID id, String name, boolean isDefault, long count, long version) {
    }

    public record BookmarkView(UUID articleId, UUID collectionId, Instant savedAt, long version) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record BookmarkItem(UUID articleId, UUID collectionId, Instant savedAt, long version, boolean available,
            ArticleSummary article) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ArticleState(UUID articleId, boolean available, BookmarkView bookmark, Instant lastVisitedAt) {
    }

    private final LibraryRepository repository;
    private final PublicContentQuery content;
    private final HistoryService history;
    private final IdGenerator ids;
    private final Clock clock;

    LibraryService(LibraryRepository repository, PublicContentQuery content, HistoryService history, IdGenerator ids,
            Clock clock) {
        this.repository = repository;
        this.content = content;
        this.history = history;
        this.ids = ids;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- collections

    @Transactional
    public List<CollectionView> collections(UUID userId) {
        ensureDefault(userId);
        return repository.collections(userId).stream().map(LibraryService::view).toList();
    }

    @Transactional
    public CollectionView createCollection(UUID userId, String rawName) {
        CollectionName name = CollectionName.of(rawName);
        ensureDefault(userId);
        if (repository.countCollections(userId) >= MAX_COLLECTIONS) {
            throw new ApiException(HttpStatus.CONFLICT, "COLLECTION_LIMIT", "En fazla 100 koleksiyon oluşturabilirsin");
        }
        if (repository.nameTaken(userId, name.normalized(), null)) {
            throw duplicate();
        }
        UUID id = ids.next();
        repository.insertCollection(userId, id, name.value(), name.normalized(), clock.instant());
        return collection(userId, id);
    }

    @Transactional
    public CollectionView renameCollection(UUID userId, UUID id, long expectedVersion, String rawName) {
        CollectionName name = CollectionName.of(rawName);
        CollectionRow row = repository.lockCollection(userId, id).orElseThrow(LibraryService::notFound);
        Preconditions.check(expectedVersion, row.version());
        if (row.isDefault()) {
            throw defaultImmutable();
        }
        if (repository.nameTaken(userId, name.normalized(), id)) {
            throw duplicate();
        }
        repository.renameCollection(userId, id, name.value(), name.normalized(), clock.instant());
        return collection(userId, id);
    }

    @Transactional
    public void deleteCollection(UUID userId, UUID id, long expectedVersion) {
        CollectionRow row = repository.lockCollection(userId, id).orElseThrow(LibraryService::notFound);
        Preconditions.check(expectedVersion, row.version());
        if (row.isDefault()) {
            throw defaultImmutable();
        }
        repository.deleteCollection(userId, id, repository.defaultCollection(userId));
    }

    // ---------------------------------------------------------------- bookmarks

    /**
     * Target-state save: a first save needs a public article and lands in {@code collectionId} or
     * "Genel"; an existing bookmark keeps its collection unless one is given.
     */
    @Transactional
    public BookmarkView save(UUID userId, UUID articleId, UUID collectionId) {
        ensureDefault(userId);
        if (collectionId != null && !repository.ownsCollection(userId, collectionId)) {
            throw notFound();
        }
        var existing = repository.lockBookmark(userId, articleId);
        if (existing.isEmpty()) {
            if (!content.isArticlePublic(articleId)) {
                throw notFound();
            }
            if (repository.countBookmarks(userId) >= MAX_BOOKMARKS) {
                throw new ApiException(HttpStatus.CONFLICT, "LIBRARY_FULL", "Kitaplığına en fazla 1000 yazı kaydedebilirsin");
            }
            UUID target = collectionId != null ? collectionId : repository.defaultCollection(userId);
            if (repository.insertBookmark(userId, articleId, target, clock.instant())) {
                return bookmark(userId, articleId);
            }
            // A concurrent request saved it first: continue as an update of that bookmark.
            existing = repository.lockBookmark(userId, articleId);
        }
        BookmarkRow row = existing.orElseThrow();
        if (collectionId != null && !collectionId.equals(row.collectionId())) {
            repository.moveBookmark(userId, articleId, collectionId);
        }
        return bookmark(userId, articleId);
    }

    @Transactional
    public void remove(UUID userId, UUID articleId) {
        repository.deleteBookmark(userId, articleId);
    }

    @Transactional
    public PageResponse<BookmarkItem> bookmarks(UUID userId, UUID collectionId, String q, String sort, int page, int size) {
        PageResponse.checkBounds(page, size);
        String sortKey = sort == null ? "saved_asc" : sort;
        if (!SORTS.contains(sortKey)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_SORT", "Sıralama geçersiz");
        }
        if (collectionId != null && !repository.ownsCollection(userId, collectionId)) {
            throw notFound();
        }
        String query = PageResponse.query(q);
        List<BookmarkRow> rows = repository.bookmarks(userId).stream()
                .filter(row -> collectionId == null || row.collectionId().equals(collectionId)).toList();
        Map<UUID, ArticleSummary> visible = content.publicSummaries(rows.stream().map(BookmarkRow::articleId).toList());
        Stream<BookmarkItem> items = rows.stream().map(row -> {
            ArticleSummary article = visible.get(row.articleId());
            return new BookmarkItem(row.articleId(), row.collectionId(), row.savedAt(), row.version(), article != null, article);
        });
        if (query != null) {
            // Unavailable records never take part in search: their metadata is not exposed.
            String needle = query.toLowerCase(TURKISH);
            items = items.filter(item -> item.article() != null && matches(item.article(), needle));
        }
        List<BookmarkItem> sorted = items.sorted(comparator(sortKey)).toList();
        int from = Math.min(page * size, sorted.size());
        return PageResponse.of(sorted.subList(from, Math.min(from + size, sorted.size())), page, size, sorted.size(), sortKey);
    }

    /** Own bookmark and last visit for up to 50 articles; hidden articles are only "unavailable". */
    @Transactional(readOnly = true)
    public List<ArticleState> articleState(UUID userId, List<UUID> articleIds) {
        if (articleIds.size() > 50) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "TOO_MANY_IDS", "En fazla 50 yazı sorgulanabilir");
        }
        List<UUID> distinct = articleIds.stream().distinct().toList();
        Map<UUID, ArticleSummary> visible = content.publicSummaries(distinct);
        Map<UUID, BookmarkRow> saved = new java.util.HashMap<>();
        repository.bookmarks(userId, visible.keySet()).forEach(row -> saved.put(row.articleId(), row));
        Map<UUID, Instant> visits = history.lastVisits(userId, visible.keySet());
        return distinct.stream().map(id -> {
            if (!visible.containsKey(id)) {
                return new ArticleState(id, false, null, null);
            }
            BookmarkRow row = saved.get(id);
            return new ArticleState(id, true,
                    row == null ? null : new BookmarkView(row.articleId(), row.collectionId(), row.savedAt(), row.version()),
                    visits.get(id));
        }).toList();
    }

    /** Public save totals per article (used for the public stats of visible articles). */
    @Transactional(readOnly = true)
    public Map<UUID, Long> saveCounts(Collection<UUID> articleIds) {
        return repository.saveCounts(articleIds);
    }

    /** Runs inside the account-deletion transaction. */
    @EventListener
    public void onAccountDeleted(AccountDeleted event) {
        repository.deleteAll(event.userId());
    }

    // ---------------------------------------------------------------- helpers

    private void ensureDefault(UUID userId) {
        CollectionName name = CollectionName.of(CollectionName.DEFAULT);
        repository.ensureDefault(userId, ids.next(), name.value(), name.normalized(), clock.instant());
    }

    private CollectionView collection(UUID userId, UUID id) {
        return repository.collections(userId).stream().filter(c -> c.id().equals(id)).map(LibraryService::view)
                .findFirst().orElseThrow();
    }

    private BookmarkView bookmark(UUID userId, UUID articleId) {
        BookmarkRow row = repository.lockBookmark(userId, articleId).orElseThrow();
        return new BookmarkView(row.articleId(), row.collectionId(), row.savedAt(), row.version());
    }

    private static CollectionView view(CollectionRow row) {
        return new CollectionView(row.id(), row.name(), row.isDefault(), row.count(), row.version());
    }

    private static boolean matches(ArticleSummary article, String needle) {
        return Stream.concat(Stream.of(article.title(), article.abstractText()),
                        article.categories().stream().map(CategoryView::name))
                .anyMatch(text -> text != null && text.toLowerCase(TURKISH).contains(needle));
    }

    private static Comparator<BookmarkItem> comparator(String sort) {
        Comparator<BookmarkItem> saved = Comparator.comparing(BookmarkItem::savedAt).thenComparing(BookmarkItem::articleId);
        Comparator<BookmarkItem> unavailableLast = Comparator.comparing(item -> item.article() == null);
        Collator collator = Collator.getInstance(TURKISH);
        return switch (sort) {
            case "saved_desc" -> saved.reversed();
            case "date_desc" -> unavailableLast.thenComparing(
                    (a, b) -> a.article() == null ? 0 : b.article().displayDate().compareTo(a.article().displayDate()))
                    .thenComparing(saved);
            case "title_asc" -> unavailableLast.thenComparing(
                    (a, b) -> a.article() == null ? 0 : collator.compare(a.article().title(), b.article().title()))
                    .thenComparing(saved);
            default -> saved;
        };
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
    }

    private static ApiException duplicate() {
        return new ApiException(HttpStatus.CONFLICT, "DUPLICATE_COLLECTION", "Bu isimde bir koleksiyon zaten var");
    }

    private static ApiException defaultImmutable() {
        return new ApiException(HttpStatus.CONFLICT, "DEFAULT_COLLECTION", "Genel koleksiyonu değiştirilemez");
    }
}
