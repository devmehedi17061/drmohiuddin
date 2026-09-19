import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/jwt";

/**
 * Clears a session cookie whose signature is valid but whose user no longer
 * checks out in the database (deleted account, bumped token_version, or a
 * cookie issued against a different database), then sends the browser to the
 * login page.
 *
 * `requireUser` redirects here instead of straight to /login because a Server
 * Component cannot modify cookies. Without this hop the proxy - which only
 * checks the cookie's signature - would keep bouncing /login back to
 * /dashboard, and the dashboard back to /login: ERR_TOO_MANY_REDIRECTS.
 */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin-panel/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
