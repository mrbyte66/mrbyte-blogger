import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const origin = new URL(process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8080");
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("Invalid BACKEND_INTERNAL_URL");
    return [{ source: "/api/v1/:path*", destination: `${origin.origin}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: "/:section(studio|preview|hesap|kaydedilenler|giris|uye-ol|sifremi-unuttum|sifre-sifirla|eposta-dogrula)/:path*", headers: [
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
    ] }];
  },
  agentRules: false,
  devIndicators: false,
  images: { qualities: [75, 90] },
};

export default nextConfig;
