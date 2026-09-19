import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { queryOne, execute } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type Role,
  type SessionClaims,
} from "./jwt";
import { can, type Action, type Resource } from "./rbac";

const BCRYPT_ROUNDS = 12;

/** Max failed logins per email (and per IP) inside the window before lockout. */
const MAX_ATTEMPTS = 6;
const WINDOW_MINUTES = 15;

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: number;
  token_version: number;
}

interface UserRow extends AdminUser {
  password_hash: string;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A *real* bcrypt hash of a random string, computed once per process.
 *
 * The unknown-email branch of `login` compares against this so it costs the same
 * ~200ms as a genuine comparison. A syntactically invalid hash would not do: bcrypt
 * rejects it in well under a millisecond, which by itself reveals whether the
 * address exists.
 */
let dummyHash: Promise<string> | null = null;
function timingDecoyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_ROUNDS);
  return dummyHash;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return (h.get("x-real-ip") ?? "").slice(0, 64);
}

// ---------------------------------------------------------------- session read

/**
 * Resolves the signed-in admin from the session cookie.
 *
 * The cookie's signature is trusted only as far as identity; `is_active` and
 * `token_version` are re-read from MySQL on every call so a deactivated account
 * or a password change kills live sessions immediately.
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const store = await cookies();
  const claims = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;

  const user = await queryOne<AdminUser>(
    "SELECT id, name, email, role, is_active, token_version FROM users WHERE id = ? LIMIT 1",
    [claims.uid],
  );
  if (!user || !user.is_active || user.token_version !== claims.tv) return null;
  return user;
}

/**
 * Redirects to the login page when there is no valid session.
 *
 * Goes via /admin-panel/session-expired (a route handler) rather than straight
 * to /login so the stale cookie gets deleted on the way. Server Components can't
 * touch cookies, and leaving a well-signed-but-dead cookie in place makes the
 * proxy bounce /login straight back here - an infinite redirect loop.
 */
export async function requireUser(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin-panel/session-expired");
  return user;
}

/** Redirects to the dashboard when the session lacks the permission. */
export async function requirePermission(action: Action, resource: Resource): Promise<AdminUser> {
  const user = await requireUser();
  if (!can(user.role, action, resource)) {
    redirect(`/admin-panel/dashboard?denied=${resource}`);
  }
  return user;
}

/**
 * Permission guard for server actions. Unlike `requirePermission` it throws instead
 * of redirecting, so the calling action can return a form error.
 */
export async function authorize(action: Action, resource: Resource): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!can(user.role, action, resource)) throw new Error("FORBIDDEN");
  return user;
}

// ---------------------------------------------------------------- login/logout

export type LoginResult =
  | { ok: true; user: AdminUser }
  | { ok: false; error: string };

async function recentFailures(email: string, ip: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM login_attempts
      WHERE success = 0
        AND created_at > (NOW() - make_interval(mins => ?))
        AND (email = ? OR (ip <> '' AND ip = ?))`,
    [WINDOW_MINUTES, email, ip],
  );
  return Number(row?.n ?? 0);
}

async function recordAttempt(email: string, ip: string, success: boolean): Promise<void> {
  await execute("INSERT INTO login_attempts (email, ip, success) VALUES (?, ?, ?)", [
    email.slice(0, 190),
    ip,
    success ? 1 : 0,
  ]);
  // Opportunistic pruning keeps the table from growing without a cron job.
  if (Math.random() < 0.05) {
    await execute("DELETE FROM login_attempts WHERE created_at < (NOW() - INTERVAL '1 day')");
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  const ip = await clientIp();

  if ((await recentFailures(normalized, ip)) >= MAX_ATTEMPTS) {
    return {
      ok: false,
      error: `Too many failed attempts. Please try again after ${WINDOW_MINUTES} minutes.`,
    };
  }

  const row = await queryOne<UserRow>(
    "SELECT id, name, email, role, is_active, token_version, password_hash FROM users WHERE email = ? LIMIT 1",
    [normalized],
  );

  // Always run one full bcrypt comparison, even for an unknown email, so the
  // response time does not reveal whether the address exists.
  const hash = row?.password_hash ?? (await timingDecoyHash());
  const passwordOk = await verifyPassword(password, hash);

  if (!row || !passwordOk || !row.is_active) {
    await recordAttempt(normalized, ip, false);
    return { ok: false, error: "Incorrect email or password." };
  }

  await recordAttempt(normalized, ip, true);
  await execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [row.id]);
  await issueSessionCookie(row);

  await writeAudit(row.id, row.email, "login", "users", String(row.id), null, ip);

  const { password_hash: _drop, ...user } = row;
  void _drop;
  return { ok: true, user };
}

/**
 * Signs and sets the session cookie for a user. Shared by `login` and by
 * `updateOwnProfile` - the latter bumps `token_version` to sign every other
 * device out on a password change, then immediately re-issues a fresh cookie
 * so the tab that made the change doesn't get logged out too.
 */
async function issueSessionCookie(user: Pick<AdminUser, "id" | "email" | "name" | "role" | "token_version">) {
  const claims: Omit<SessionClaims, "iat" | "exp" | "nbf" | "iss" | "aud"> = {
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tv: user.token_version,
  };
  const token = await signSession(claims);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await writeAudit(user.id, user.email, "logout", "users", String(user.id), null, await clientIp());
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Invalidates every issued token for a user (password change / forced logout). */
export async function revokeSessions(userId: number): Promise<void> {
  await execute("UPDATE users SET token_version = token_version + 1 WHERE id = ?", [userId]);
}

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; error: string; field?: "currentPassword" | "newPassword" | "name" };

/**
 * Lets a logged-in user change their own name and/or password.
 *
 * Distinct from the ADMIN-only "reset another user's password" flow in
 * `src/lib/actions/admin/users.ts`: that one trusts the ADMIN's own session and
 * needs no old password. This one is self-service, so it requires the current
 * password first - otherwise a session left open on a shared computer could be
 * used to silently take over the account by setting a new password.
 */
export async function updateOwnProfile(
  currentPassword: string,
  updates: { name?: string; newPassword?: string },
): Promise<ProfileUpdateResult> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, error: "Your session has expired. Please log in again." };

  const row = await queryOne<UserRow>(
    "SELECT id, name, email, role, is_active, token_version, password_hash FROM users WHERE id = ?",
    [current.id],
  );
  if (!row) return { ok: false, error: "Account not found." };

  const passwordOk = await verifyPassword(currentPassword, row.password_hash);
  if (!passwordOk) {
    return { ok: false, error: "Current password is incorrect.", field: "currentPassword" };
  }

  const name = updates.name?.trim();
  if (name !== undefined && name.length < 2) {
    return { ok: false, error: "Please enter a name.", field: "name" };
  }

  let tokenVersion = row.token_version;
  if (updates.newPassword) {
    await execute("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?", [
      await hashPassword(updates.newPassword),
      row.id,
    ]);
    tokenVersion += 1;
  }
  if (name !== undefined && name !== row.name) {
    await execute("UPDATE users SET name = ? WHERE id = ?", [name, row.id]);
  }

  // Re-issue a cookie bound to the new token_version so this tab stays signed
  // in even though the password change just invalidated every other session.
  await issueSessionCookie({
    id: row.id,
    email: row.email,
    name: name ?? row.name,
    role: row.role,
    token_version: tokenVersion,
  });

  await writeAudit(
    row.id,
    row.email,
    "update-profile",
    "users",
    String(row.id),
    updates.newPassword ? "password changed" : "name changed",
  );

  return { ok: true };
}

// ---------------------------------------------------------------- audit trail

export async function writeAudit(
  userId: number | null,
  userEmail: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail: string | null,
  ip?: string,
): Promise<void> {
  try {
    await execute(
      `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, detail, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userEmail.slice(0, 190), action, entity, entityId, detail, ip ?? (await clientIp())],
    );
  } catch {
    // Audit logging must never break the operation it is recording.
  }
}

/** Convenience wrapper used by the CRUD actions. */
export async function audit(
  user: AdminUser,
  action: string,
  entity: Resource | string,
  entityId: string | number | null,
  detail?: string,
): Promise<void> {
  await writeAudit(
    user.id,
    user.email,
    action,
    entity,
    entityId === null ? null : String(entityId),
    detail ?? null,
  );
}
