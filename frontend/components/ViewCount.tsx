"use client";

import { EngagementIcon } from "./EngagementIcon";

import { useArticleViews } from "../lib/reactions/use-views";

export function ViewCount({ slugs, series = false }: { slugs: readonly string[]; series?: boolean }) {
  const { totals, error } = useArticleViews(slugs[0] ?? "");
  const count = [...new Set(slugs)].reduce((sum, slug) => sum + (totals[slug] ?? 0), 0);
  const label = `${count} görüntülenme${series ? " · bölüm toplamı" : ""}`;
  return <span className="view-count" aria-label={error ? "Görüntülenme sayısı okunamadı" : label} title={error || `${series ? "Seri bölüm görüntülenmeleri toplamı. " : ""}Şimdilik bu tarayıcıdaki görüntülenmeler.`}><EngagementIcon kind="view" /> {error ? "—" : count}</span>;
}
