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
import { AmbientAudioProvider, AmbientAudioToggle } from "../components/audio/AmbientAudio";
import { SavedProvider } from "../components/saved/SavedProvider";
import { RouteMotion } from "../components/SlideLink";
import { SitePreferences } from "../components/SitePreferences";

export const metadata: Metadata = {
  title: "SATIR. — Kod, kelime ve aradakiler",
  description: "Yazılım, yapay zekâ, edebiyat ve kültür üzerine kişisel bir evren. Etkileşimli arayüz taslağı.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('satir:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;document.documentElement.dataset.motion=localStorage.getItem('satir:motion')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on'}catch(e){}" }} /></head><body><SitePreferences><SavedProvider><AmbientAudioProvider><RouteMotion>{children}</RouteMotion><AmbientAudioToggle /></AmbientAudioProvider></SavedProvider></SitePreferences></body></html>;
}
