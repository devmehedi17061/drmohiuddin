import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

declare global {
  // Reused across dev hot reloads so we don't leak connections.
  var __drmPool: Pool | undefined;
}

// `pg` parses a DATE column (OID 1082) into a JS Date at UTC midnight by
// default. Formatted later with the server's local timezone, a date-only
// value like `appointments.preferred_date` could then display as the day
// before for any timezone behind UTC. Returning the raw 'YYYY-MM-DD' string
// instead - matching the previous mysql2 `dateStrings` behaviour - sidesteps
// the ambiguity entirely; callers already accept `string | Date`.
types.setTypeParser(1082, (value) => value);

/** Anything `pg` can bind to a $1, $2, ... placeholder. */
export type SqlParam = string | number | boolean | Date | Buffer | null;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy it from Supabase → Project Settings → Database → " +
        "Connection string (URI), and put it in .env.local.",
    );
  }

  const pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_SIZE ?? 10),
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  // A pooled client can go bad between checkouts (e.g. the remote side closed
  // an idle connection); without this handler that surfaces as an unhandled
  // 'error' event and crashes the process instead of just failing the next query.
  pool.on("error", (err) => {
    console.error("Unexpected error on idle Postgres client", err);
  });

  return pool;
}

let localPool: Pool | undefined;

/**
 * Created on first query rather than at import time. `next build` imports
 * every page module while "collecting page data" - before it renders
 * anything - and an eager pool made that phase throw the moment DATABASE_URL
 * was missing, hiding the real failure point. Lazily, an unset variable only
 * surfaces where a query actually runs.
 */
function getPool(): Pool {
  if (process.env.NODE_ENV !== "production") {
    return (global.__drmPool ??= createPool());
  }
  return (localPool ??= createPool());
}

/**
 * Adapts a MySQL-flavoured query string (kept as-is at every call site for a
 * smaller diff from the previous driver) to Postgres:
 *  - `?` placeholders become positional `$1, $2, ...` (skipped inside quoted
 *    string literals).
 *  - Backtick identifier quoting (`` `table` ``) is MySQL-only syntax that
 *    Postgres rejects outright; backticks are simply dropped, which is safe
 *    here because every table/column name in this schema is already a valid
 *    unquoted lowercase Postgres identifier (including `settings.key`, which
 *    is not a reserved word).
 */
function toPostgres(sql: string): string {
  let index = 0;
  let inString = false;
  let out = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== "\\") inString = !inString;
    if (ch === "`") continue;
    if (ch === "?" && !inString) {
      index += 1;
      out += `$${index}`;
    } else {
      out += ch;
    }
  }
  return out;
}

/** SELECT returning many rows. Always pass values via `params` - never interpolate. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(toPostgres(sql), params);
  return result.rows;
}

/** SELECT returning the first row, or null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export interface ExecuteResult {
  insertId: number;
  affectedRows: number;
}

/**
 * INSERT / UPDATE / DELETE. Mirrors mysql2's `ResultSetHeader` shape so calling
 * code didn't need to change: `insertId` comes from an auto-appended
 * `RETURNING id`, added only when the statement doesn't already have one and
 * the table actually has an `id` column (i.e. not the `settings` table, whose
 * primary key is `key`).
 */
export async function execute(sql: string, params: SqlParam[] = []): Promise<ExecuteResult> {
  const isInsert = /^\s*insert\s/i.test(sql);
  const hasReturning = /\breturning\b/i.test(sql);
  const targetsSettings = /\binto\s+`?settings`?\b/i.test(sql);
  const withReturning =
    isInsert && !hasReturning && !targetsSettings ? `${sql} RETURNING id` : sql;

  const result = await getPool().query(toPostgres(withReturning), params);
  const insertId =
    isInsert && !targetsSettings && result.rows[0]?.id !== undefined
      ? Number(result.rows[0].id)
      : 0;

  return { insertId, affectedRows: result.rowCount ?? 0 };
}

/** Runs `fn` inside a transaction, rolling back on any throw. */
export async function transaction<T>(fn: (conn: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** True when the database is reachable - used by the setup/health checks. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
