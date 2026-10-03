"use client";

import { SlideLink as Link } from "../SlideLink";
import { ThemeToggle } from "../SitePreferences";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import type { Theme } from "../../lib/builder/model";
import type { BlogSeries } from "../../lib/series/model";
import { SeriesCatalog } from "./SeriesCatalog";
export function SeriesPageView({ slug, theme, series, preview = false }: { slug: string; theme: Theme; series: readonly BlogSeries[]; preview?: boolean }) {
  const appearance = themeAppearance(theme);
  return <main className={`${appearance.className} reading-page`} style={appearance.style}>
    <header className="reading-header" data-edit-field="layout"><Link href="/">{theme.siteName}.</Link><ThemeToggle defaultDark={theme.surface === "night"} /><Link href="/">← Siteye dön</Link></header>
    <div className="series-permalink-content"><SeriesCatalog series={series} selectedSeriesSlug={slug} preview={preview} /></div>
  </main>;
}
export function SeriesPage({ slug }: { slug: string }) {
  const { workspace } = useWorkspace(); const { series, ready } = useSeriesWorkspace();
  return ready ? <SeriesPageView slug={slug} theme={workspace.applied} series={series} /> : <p role="status">Seriler yükleniyor…</p>;
}
