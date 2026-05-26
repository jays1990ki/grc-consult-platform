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
    // Keep heavy server-only packages out of the edge/client bundles
    serverComponentsExternalPackages: [
      "@react-pdf/renderer",
      "better-sqlite3",
    ],
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

  // A05: Prevent source-map exposure in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
