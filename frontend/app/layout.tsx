import type { Metadata } from "next";
import "./globals.css";
import "./themes.css";
import "./reading-tools.css";
import "./preferences.css";
import "./transitions.css";
import "./engagement.css";
import "./saved.css";
import "./audio.css";
import "./editorial-metadata.css";
import "./scene-featured.css";
import "./auth.css";
import { getPublicSite, getCatalogs } from "../lib/api/public-server";
import { articleFromApi, seriesFromApi, themeFromApi } from "../lib/api/content";
import { PublicDataProvider } from "../components/api/PublicDataProvider";
import { AuthProvider } from "../components/auth/AuthProvider";
import { AmbientAudioProvider, AmbientAudioToggle } from "../components/audio/AmbientAudio";
import { SavedProvider } from "../components/saved/SavedProvider";
import { RouteMotion } from "../components/SlideLink";
import { SitePreferences } from "../components/SitePreferences";

export const dynamic = "force-dynamic";
export async function generateMetadata():Promise<Metadata> {const site=await getPublicSite();return {title:site.seo.title || site.siteName,description:site.seo.description,robots:{index:site.indexingEnabled&&site.seo.indexable,follow:site.indexingEnabled},icons:{icon:"/favicon.svg"}};}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [site, catalogs] = await Promise.all([getPublicSite(), getCatalogs()]);
  const data = { articleTotal:catalogs.articles.totalElements, seriesTotal:catalogs.series.totalElements, theme: themeFromApi(site,catalogs.categories.items), articles: catalogs.articles.items.map(articleFromApi), series: catalogs.series.items.map(seriesFromApi) };
  return <html lang="tr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('satir:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;document.documentElement.dataset.motion=localStorage.getItem('satir:motion')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on'}catch(e){}" }} /></head><body><PublicDataProvider data={data}><SitePreferences><AuthProvider><SavedProvider><AmbientAudioProvider><RouteMotion>{children}</RouteMotion><AmbientAudioToggle /></AmbientAudioProvider></SavedProvider></AuthProvider></SitePreferences></PublicDataProvider></body></html>;
}
