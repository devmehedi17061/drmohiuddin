import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

const LOGIN_PATH = "/admin-panel/login";
const DASHBOARD_PATH = "/admin-panel/dashboard";

/**
 * First gate in front of the admin panel (Next 16 `proxy` convention). It only checks the cookie's signature and
 * expiry (the Edge runtime has no MySQL access); every page and server action behind
 * it re-validates against the database via `getCurrentUser`.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin-panel" || pathname === "/admin-panel/") {
    return NextResponse.redirect(new URL(claims ? DASHBOARD_PATH : LOGIN_PATH, req.url));
  }

  if (pathname.startsWith(LOGIN_PATH)) {
    if (claims) return NextResponse.redirect(new URL(DASHBOARD_PATH, req.url));
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith(DASHBOARD_PATH) && !claims) {
    const url = new URL(LOGIN_PATH, req.url);
    url.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(url);
    // Drop the unusable cookie so the browser stops sending it.
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return withSecurityHeaders(NextResponse.next());
}

function withSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/admin-panel/:path*"],
};
