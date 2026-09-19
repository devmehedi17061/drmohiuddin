/**
 * Incremental, idempotent schema migrations for a database created before a
 * given change shipped. `db/supabase-schema.sql` only covers a fresh install,
 * so anything added to an existing table goes here instead. Safe to re-run.
 *
 * For this project, schema changes are normally applied directly against
 * Supabase via the `apply_migration` MCP tool during development - this
 * script exists for anyone recreating/updating a database outside of that
 * (e.g. a second environment) using the same DATABASE_URL the app uses.
 *
 * Usage: npm run db:migrate
 */
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

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
});
await client.connect();

async function columnExists(table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

/**
 * Add new entries here as the schema evolves. Each `run()` should check
 * before acting (via `columnExists` or similar) so re-running this script is
 * always a no-op once a migration has already landed. Use plain Postgres DDL -
 * no MySQL-isms like inline `ENUM(...)` or `ADD COLUMN ... AFTER x` (Postgres
 * has neither; use `TEXT` + `CHECK` for enum-like columns, and new columns
 * always land at the end of the table, which is harmless since every query in
 * this app selects columns by name, never by position).
 */
const MIGRATIONS = [
  // Example:
  // {
  //   name: "widgets.color",
  //   async run() {
  //     if (!(await columnExists("widgets", "color"))) {
  //       await client.query("ALTER TABLE widgets ADD COLUMN color VARCHAR(20)");
  //     }
  //   },
  // },
];

try {
  if (MIGRATIONS.length === 0) {
    console.log("No pending migrations - the schema is already up to date.");
  }
  for (const migration of MIGRATIONS) {
    await migration.run();
    console.log(`✔ ${migration.name}`);
  }
} catch (err) {
  console.error("✖ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
