"use client";

import { EngagementIcon } from "./EngagementIcon";

import { useArticleStats } from "../lib/reactions/use-views";

export function ViewCount({ slugs, series = false }: { slugs: readonly string[]; series?: boolean }) {
  const stats = useArticleStats(slugs);
  if (!stats) return <span className="view-count" aria-label="Görüntülenme sayısı yalnız yayındaki yazılarda gösterilir" title="Yayımlanmamış içerikte sayı yok"><EngagementIcon kind="view" /> —</span>;
  const label = `${stats.views} görüntülenme${series ? " · bölüm toplamı" : ""}`;
  return <span className="view-count" aria-label={label} title={series ? "Yayındaki bölümlerin görüntülenme toplamı" : "Görünen kart ve kalıcı sayfa açılışları; tekil okur sayısı değildir"}><EngagementIcon kind="view" /> {stats.views}</span>;
}
