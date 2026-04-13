import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  // allowedDevOrigins: ["192.168.88.224"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: undefined,
  },
};

export default nextConfig;
