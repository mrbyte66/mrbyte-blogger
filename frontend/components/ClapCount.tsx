"use client";

import { EngagementIcon } from "./EngagementIcon";

import { useArticleStats } from "../lib/reactions/use-views";

export function ClapCount({ slugs, series = false }: { slugs: readonly string[]; series?: boolean }) {
  const stats = useArticleStats(slugs);
  if (!stats) return <span className="clap-count" aria-label="Alkış sayısı yalnız yayındaki yazılarda gösterilir" title="Yayımlanmamış içerikte sayı yok"><EngagementIcon kind="clap" /> —</span>;
  return <span className="clap-count" aria-label={`${stats.claps} alkış${series ? " · seri yazılarının toplamı" : ""}`} title={series ? "Yayındaki bölümlerin alkış toplamı" : "Okurların alkış toplamı"}><EngagementIcon kind="clap" /> {stats.claps}</span>;
}
