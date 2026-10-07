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
import { AuthProvider } from "../components/auth/AuthProvider";
import { AmbientAudioProvider, AmbientAudioToggle } from "../components/audio/AmbientAudio";
import { SavedProvider } from "../components/saved/SavedProvider";
import { EngagementProvider } from "../components/engagement/EngagementProvider";
import { RouteMotion } from "../components/SlideLink";
import { SitePreferences } from "../components/SitePreferences";
import { SiteDataProvider } from "../components/data/SiteData";
import { PublicContentRefresh } from "../components/data/PublicContentRefresh";
import { BackendUnavailable, loadPublicContent, siteOrigin, type PublicContent } from "../lib/api/server";

// Content comes from the API on every request; nothing published is baked in at build time.
export const dynamic = "force-dynamic";

async function publicContent(): Promise<PublicContent | null> {
  try { return await loadPublicContent(); }
  catch (error) { if (error instanceof BackendUnavailable) return null; throw error; }
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await publicContent();
  const site = content?.site;
  const name = site?.siteName ?? "SATIR";
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: site?.seo?.title ?? `${name}. — Kod, kelime ve aradakiler`, template: `%s — ${name}.` },
    description: site?.seo?.description ?? "Yazılım, yapay zekâ, edebiyat ve kültür üzerine kişisel bir evren.",
    // Indexing needs both the owner's site setting and the deployment gate (backend decides).
    robots: site?.indexingEnabled ? { index: true, follow: true } : { index: false, follow: false },
    icons: { icon: "/favicon.svg" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = await publicContent();
  return <html lang="tr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('satir:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;document.documentElement.dataset.motion=localStorage.getItem('satir:motion')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on'}catch(e){}" }} /></head><body>
    {!content && <p className="site-unavailable" role="alert">Sunucuya şu anda ulaşılamıyor. İçerikler geçici olarak gösterilemiyor; biraz sonra tekrar dene.</p>}
    <SiteDataProvider site={content?.site ?? { indexingEnabled: false, canonicalOrigin: siteOrigin() }} articles={content?.articles ?? []} series={content?.series ?? []}>
      <PublicContentRefresh /><SitePreferences><AuthProvider><EngagementProvider><SavedProvider><AmbientAudioProvider><RouteMotion>{children}</RouteMotion><AmbientAudioToggle /></AmbientAudioProvider></SavedProvider></EngagementProvider></AuthProvider></SitePreferences>
    </SiteDataProvider>
  </body></html>;
}
