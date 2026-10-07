import type { NextConfig } from "next";

const backend = (process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  output: "standalone",
  images: { qualities: [75, 90] },
  // Same-origin API: the browser calls /api/v1/*. In production the reverse proxy routes /api to
  // Spring before Next; locally this rewrite forwards it. Transport only — no business API in Next.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
