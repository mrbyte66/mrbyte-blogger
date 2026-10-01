import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SATIR. — Kod, kelime ve aradakiler",
  description: "Yazılım, yapay zekâ, edebiyat ve kültür üzerine kişisel bir evren. Etkileşimli arayüz taslağı.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
