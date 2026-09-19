import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * `script-src` keeps 'unsafe-inline' because Next's hydration bootstrap and the
 * JSON-LD blocks are inline; a nonce-based policy would force every page to render
 * per-request and give up the ISR cache on the landing page. The remaining
 * directives are still worth having: they stop plugin content, `<base>` hijacking,
 * form posts to a third party, and framing of the site.
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is only needed by the dev-mode React Refresh runtime.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
  "font-src 'self' data:",
  // Dev needs the HMR websocket; production talks only to its own origin.
  `connect-src 'self'${isProd ? "" : " ws: http://localhost:*"}`,
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Only meaningful once the site is actually served over HTTPS.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Do not advertise the framework to scanners.
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    serverActions: {
      // Gallery uploads are multi-file; the default 1MB body limit is far too small.
      bodySizeLimit: "12mb",
    },
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Uploaded media has a random, content-specific filename, so it never changes.
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          // Serve uploads as inert files even if something odd got stored.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
      {
        // The admin panel must never be cached or indexed.
        source: "/admin-panel/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
