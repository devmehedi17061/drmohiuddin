import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Uploaded images are stored in Supabase Storage (public bucket), not on local
// disk - Vercel's serverless functions have a read-only filesystem, so this is
// the same host in every environment. The host is allow-listed as a wildcard
// rather than derived from NEXT_PUBLIC_SUPABASE_URL: this file runs at *build*
// time, and a build without that variable used to produce a bundle in which
// every uploaded image made `next/image` throw ("hostname not configured") and
// the CSP blocked it - i.e. the public page broke the moment a photo was set.
const SUPABASE_IMG_CSP = "https://*.supabase.co";

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
  `img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com ${SUPABASE_IMG_CSP}`,
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
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
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
