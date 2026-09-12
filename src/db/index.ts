import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

/* Serverless-safe pool sizing.
 *
 * Every serverless function instance owns its own pool, and Supabase's
 * session-mode pooler allows very few clients (15 on the free plan). Keep the
 * per-instance pool to a single connection in production so concurrent
 * invocations can never exhaust it, and let DATABASE_POOL_SIZE raise it when
 * the DATABASE_URL points at the transaction pooler, which multiplexes and
 * tolerates many more clients. */
const poolMax = Number(
  process.env.DATABASE_POOL_SIZE ??
    (process.env.NODE_ENV === "production" ? 1 : 5),
);

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 1,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
