import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "*.devtunnels.ms"],
    },
  },
};

export default nextConfig;
