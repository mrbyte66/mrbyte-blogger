"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContent } from "../../components/data/SiteData";
import { useEngagement } from "../../components/engagement/EngagementProvider";
import type { Article, ArticleStats } from "../content";

/** Articles of the current surface by slug (visitor content or Studio content). */
export function useArticleRefs(slugs: readonly string[]): (Article | undefined)[] {
  const { articles } = useContent();
  return slugs.map((slug) => articles.find((article) => article.slug === slug));
}

/**
 * Server totals for one article, or the sum of several (a series counts its public chapters).
 * {@code null} when no total is known, e.g. for Studio drafts: the UI shows "—", never a made-up 0.
 */
export function useArticleStats(slugs: readonly string[]): ArticleStats | null {
  const { overrides } = useEngagement();
  const refs = useArticleRefs([...new Set(slugs)]);
  let known = false;
  const total: ArticleStats = { views: 0, claps: 0, saves: 0 };
  for (const article of refs) {
    if (!article?.id || (!article.stats && !overrides[article.id])) continue;
    known = true;
    const value = { ...article.stats, ...overrides[article.id] };
    total.views += value.views ?? 0; total.claps += value.claps ?? 0; total.saves += value.saves ?? 0;
  }
  return known ? total : null;
}

/** Counts the full-page reader once when the permalink opens (never the side panel or Studio). */
export function usePermalinkView(slug: string, enabled: boolean) {
  const { recordView } = useEngagement();
  const [article] = useArticleRefs([slug]);
  const id = article?.id;
  useEffect(() => { if (enabled && id && article?.stats) recordView(id, "permalink"); }, [enabled, id, article?.stats, recordView]);
}

/** Counts a summary card when at least 20% of it first becomes visible, once per page view. */
export function useVisibleArticleView(slug: string, enabled = true): { attach: (node: HTMLElement | null) => void } {
  const ref = useRef<HTMLElement | null>(null);
  const { recordView } = useEngagement();
  const [article] = useArticleRefs([slug]);
  // Only published content carries public totals; drafts and previews never send events.
  const id = article?.stats ? article.id : undefined;
  const attach = useCallback((node: HTMLElement | null) => { ref.current = node; }, []);
  useEffect(() => {
    const node = ref.current;
    if (!enabled || !id || !node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { recordView(id, "card"); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, id, recordView]);
  return { attach };
}
