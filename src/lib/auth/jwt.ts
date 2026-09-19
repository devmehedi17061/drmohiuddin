/**
 * Edge-safe JWT helpers.
 *
 * Kept free of `next/headers`, `mysql2` and `bcryptjs` on purpose: middleware runs
 * on the Edge runtime and can only do signature + expiry checks. Anything that must
 * reflect *current* database state (deactivated user, bumped token_version) is
 * re-checked server-side in `session.ts`.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "drm_session";

export type Role = "ADMIN" | "EDITOR";

export interface SessionClaims extends JWTPayload {
  uid: number;
  email: string;
  name: string;
  role: Role;
  /** Mirrors users.token_version; a mismatch invalidates the session. */
  tv: number;
}

/** Seconds a session stays valid. Defaults to 12 hours. */
export const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 12);

let cachedKey: Uint8Array | null = null;

function secretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    );
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export async function signSession(claims: Omit<SessionClaims, keyof JWTPayload>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + SESSION_MAX_AGE)
    .setIssuer("drmohiuddin")
    .setAudience("drmohiuddin-admin")
    .sign(secretKey());
}

/** Verifies signature, issuer, audience and expiry. Returns null on any failure. */
export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "drmohiuddin",
      audience: "drmohiuddin-admin",
      algorithms: ["HS256"],
    });
    const claims = payload as SessionClaims;
    if (typeof claims.uid !== "number" || (claims.role !== "ADMIN" && claims.role !== "EDITOR")) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
