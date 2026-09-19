/**
 * Resets one admin/editor account's password the *correct* way - through
 * bcryptjs at the app's own cost factor - and forces that account to log in
 * again everywhere (bumps token_version, invalidating any existing session).
 *
 * This exists because there is no in-app "forgot password" flow (an ADMIN
 * resets other users from the panel, but nothing helps if that ADMIN's own
 * password stops working - e.g. someone pastes a hash from an external tool
 * directly into the `users` table, in the wrong format or for a password
 * they don't actually remember, locking themselves out).
 *
 * Usage:
 *   node db/reset-password.mjs <email> <new-password>
 *   node db/reset-password.mjs                          (uses ADMIN_EMAIL / ADMIN_PASSWORD from .env.local)
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { loadEnv } from "./env.mjs";

loadEnv();

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || "";

if (!email || password.length < 10) {
  console.error(
    "Usage: node db/reset-password.mjs <email> <new-password>\n" +
      "(password must be at least 10 characters; or set ADMIN_EMAIL/ADMIN_PASSWORD in .env.local and run with no args)",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "✖ DATABASE_URL is not set. Copy it from Supabase → Project Settings → Database → " +
      "Connection string (URI) into .env.local first.",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const { rows } = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (!rows.length) {
    console.error(`✖ No user found with email "${email}".`);
    process.exitCode = 1;
  } else {
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      "UPDATE users SET password_hash = $1, token_version = token_version + 1, is_active = 1 WHERE id = $2",
      [hash, rows[0].id],
    );
    console.log(`✔ Password reset for ${email}. Every existing session for this account is now signed out.`);
    console.log(`  Log in at /admin-panel with the new password.`);
  }
} catch (err) {
  console.error("✖ Reset failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
