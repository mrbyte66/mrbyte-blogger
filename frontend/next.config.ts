import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  images: { qualities: [75, 90] },
};

export default nextConfig;
