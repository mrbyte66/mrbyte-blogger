package com.satir.editorial.application;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.SeriesRepository;
import com.satir.media.application.MediaReferencePolicy;

/**
 * Editorial side of media access: an asset is public only while the *current* revision of a
 * public article, or the cover of a public series, uses it. Old revisions grant nothing.
 */
@Component
class EditorialMediaPolicy implements MediaReferencePolicy {

    private final ArticleRepository articles;
    private final SeriesRepository series;

    EditorialMediaPolicy(ArticleRepository articles, SeriesRepository series) {
        this.articles = articles;
        this.series = series;
    }

    @Override
    public boolean isPubliclyReferenced(UUID assetId) {
        return articles.assetPubliclyReferenced(assetId) || series.assetPubliclyReferenced(assetId);
    }

    @Override
    public boolean isReferenced(UUID assetId) {
        return articles.assetReferenced(assetId) || series.assetReferenced(assetId);
    }
}
