import type { MetadataRoute } from "next";
import { canonical, getPublicSite } from "../lib/api/public-server";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site=await getPublicSite();
  return site.indexingEnabled ? { rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/preview", "/hesap", "/kaydedilenler", "/giris", "/uye-ol", "/sifremi-unuttum", "/sifre-sifirla", "/eposta-dogrula", "/api/"] }, sitemap: canonical(site,"/sitemap.xml") } : { rules: { userAgent: "*", disallow: "/" } };
}
