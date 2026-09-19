/**
 * `NEXT_PUBLIC_SITE_URL` needs a scheme to be a valid absolute URL - a bare
 * domain like "example.com" (missing "https://") throws ERR_INVALID_URL from
 * `new URL()` and takes down the entire build. Adding the scheme when it's
 * missing keeps a copy-paste mistake in an env var from breaking production.
 */
export function siteUrlString(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function siteUrl(): URL {
  return new URL(siteUrlString());
}
