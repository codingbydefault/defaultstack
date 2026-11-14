import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the Ubuntu host.
  // Vercel does not use this folder; its own builder stays the fallback.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
