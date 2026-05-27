/** @type {import('next').NextConfig} */

// A02 — Security headers applied to every response
const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    // max-age 1 year; only active when served over HTTPS
    value: "max-age=31536000; includeSubDomains",
  },
  {
    // Content-Security-Policy — restrictive but functional for Next.js + inline styles
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js injects inline scripts; use nonce in production for stricter policy
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind generates inline styles; blob: for PDF downloads
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      // blob: for client-side PDF download, data: for file previews
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  experimental: {
    // Enables instrumentation.ts → register() called once on server start.
    // Used to auto-create DB tables + seed default users before first request.
    instrumentationHook: true,
    // Keep heavy server-only packages out of the edge/client bundles
    serverComponentsExternalPackages: [
      "@react-pdf/renderer",
      "better-sqlite3",
    ],
  },

  // Explicit @/ alias for webpack — ensures Linux (Render.com) resolves
  // path aliases the same way as macOS even without baseUrl in tsconfig.
  webpack(config) {
    const path = require("path");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    return config;
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Serve images directly without /_next/image optimizer.
  // sharp (required by the optimizer) fails on Render.com's Linux environment.
  // unoptimized: true serves /public files as-is — simpler and reliable.
  images: {
    unoptimized: true,
  },

  // A05: Prevent source-map exposure in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
