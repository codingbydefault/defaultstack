import type { NextConfig } from "next";

// Baseline headers for every host. HSTS is separate: Vercel already sends it,
// and a second, weaker header would be the one browsers keep.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "frame-src 'none'",
      "form-action 'self' https://github.com/settings/apps/new https://www.defaultstackr.cloud https://defaultstackr.cloud",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://www.defaultstackr.cloud https://defaultstackr.cloud",
    ].join("; "),
  },
];

// www.defaultstackr.cloud is the Cloudflare origin and currently sends no HSTS.
// max-age only: includeSubDomains would also pin every project hostname.
const cloudHsts = [{ key: "Strict-Transport-Security", value: "max-age=63072000" }];

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the Ubuntu host.
  // Vercel does not use this folder; its own builder stays the fallback.
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/:path*", has: [{ type: "host", value: "www.defaultstackr.cloud" }], headers: cloudHsts },
      { source: "/:path*", has: [{ type: "host", value: "defaultstackr.cloud" }], headers: cloudHsts },
    ];
  },
};

export default nextConfig;
