package com.satir.editorial.application;

import java.time.Clock;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.domain.EditorialValues;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.CategoryRepository;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.text.Slugs;
import com.satir.platform.validation.ValidationException;

/** Owner-managed topics. A topic in use cannot be deleted (no silent mass content mutation). */
@Service
public class CategoryCommands {

    private static final Locale TURKISH = Locale.forLanguageTag("tr");

    private final CategoryRepository categories;
    private final ArticleRepository articles;
    private final IdGenerator ids;
    private final Clock clock;

    CategoryCommands(CategoryRepository categories, ArticleRepository articles, IdGenerator ids, Clock clock) {
        this.categories = categories;
        this.articles = articles;
        this.ids = ids;
        this.clock = clock;
    }

    @Transactional
    public UUID create(String name, String slug) {
        String cleanName = EditorialValues.requireText("name", name, 1, 80).strip();
        String cleanSlug = slug == null || slug.isBlank() ? Slugs.fromTitle(cleanName) : slug.strip();
        if (!Slugs.isValid(cleanSlug)) {
            throw new ValidationException("slug", "FORMAT");
        }
        String normalized = cleanName.toLowerCase(TURKISH);
        if (categories.slugOrNameTaken(cleanSlug, normalized, null)) {
            throw duplicate();
        }
        UUID id = ids.next();
        categories.insert(id, cleanSlug, cleanName, normalized, clock.instant());
        return id;
    }

    @Transactional
    public void update(UUID id, long version, String name, String slug) {
        var current = categories.find(id).orElseThrow(ArticleCommands::notFound);
        String cleanName = name == null ? current.name() : EditorialValues.requireText("name", name, 1, 80).strip();
        String cleanSlug = slug == null ? current.slug() : slug.strip();
        if (!Slugs.isValid(cleanSlug)) {
            throw new ValidationException("slug", "FORMAT");
        }
        String normalized = cleanName.toLowerCase(TURKISH);
        if (categories.slugOrNameTaken(cleanSlug, normalized, id)) {
            throw duplicate();
        }
        if (categories.update(id, version, cleanSlug, cleanName, normalized, clock.instant()) == 0) {
            throw Preconditions.stale();
        }
    }

    @Transactional
    public void delete(UUID id, long version) {
        categories.find(id).orElseThrow(ArticleCommands::notFound);
        if (articles.categoryInUse(id)) {
            throw new ApiException(HttpStatus.CONFLICT, "CATEGORY_IN_USE", "Bu konu yazılarda kullanılıyor");
        }
        if (categories.delete(id, version) == 0) {
            throw Preconditions.stale();
        }
    }

    private static ApiException duplicate() {
        return new ApiException(HttpStatus.CONFLICT, "CATEGORY_EXISTS", "Bu ad veya bağlantıyla bir konu var");
    }
}
