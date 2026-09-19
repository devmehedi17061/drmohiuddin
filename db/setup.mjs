/**
 * Applies db/supabase-schema.sql to whatever Postgres database DATABASE_URL
 * points at. Used to bootstrap a *fresh* Supabase project from scratch if you
 * ever need to recreate one outside of the Supabase MCP tools (which is how
 * this project's schema was originally applied).
 *
 * Usage: npm run db:setup
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadEnv } from "./env.mjs";

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error(
    "✖ DATABASE_URL is not set. Copy it from Supabase → Project Settings → Database → " +
      "Connection string (URI) into .env.local first.",
  );
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), "db", "supabase-schema.sql");
const sql = await readFile(schemaPath, "utf8");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("✔ Schema applied.");
} catch (err) {
  console.error("✖ Schema failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
