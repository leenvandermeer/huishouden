import type { NextConfig } from "next";
import { LEGACY_ROUTE_REDIRECTS } from "./src/lib/product";

const scriptSrc = ["script-src 'self'", "'unsafe-inline'", process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""].filter(Boolean).join(" ");
const productionHeaders = process.env.NODE_ENV === "production"
  ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
  : [];

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "img-src 'self' data: blob:",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self'",
              "font-src 'self' data:",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...productionHeaders,
        ],
      },
    ];
  },
  async redirects() {
    return LEGACY_ROUTE_REDIRECTS.map((redirect) => ({ ...redirect, permanent: false }));
  },
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
