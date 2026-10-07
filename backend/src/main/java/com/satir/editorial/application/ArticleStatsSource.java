package com.satir.editorial.application;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

import com.satir.editorial.application.EditorialViews.ArticleStats;

/**
 * Port for public article totals ({@code views, claps, saves}). Implemented by the engagement
 * module so editorial does not depend on it; callers pass only article IDs that are currently public.
 */
public interface ArticleStatsSource {

    Map<UUID, ArticleStats> stats(Collection<UUID> articleIds);
}
