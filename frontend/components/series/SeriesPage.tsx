"use client";

import { SlideLink as Link } from "../SlideLink";
import { ThemeToggle } from "../SitePreferences";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import { SeriesCatalog } from "./SeriesCatalog";
export function SeriesPage({ slug }: { slug: string }) {
  const { workspace } = useWorkspace(); const { series, ready } = useSeriesWorkspace();
  const appearance = themeAppearance(workspace.applied);
  return <main className={`${appearance.className} reading-page`} style={appearance.style}>
    <header className="reading-header"><Link href="/">{workspace.applied.siteName}.</Link><ThemeToggle defaultDark={workspace.applied.surface === "night"} /><Link href="/">← Siteye dön</Link></header>
    <div className="series-permalink-content">{ready ? <SeriesCatalog series={series} selectedSeriesSlug={slug} /> : <p role="status">Seri yükleniyor…</p>}</div>
  </main>;
}
