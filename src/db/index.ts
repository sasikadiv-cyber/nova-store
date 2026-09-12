import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // Resilience: keep connections alive and retry briefly so a momentary
    // hiccup in the database does not fail an entire Server Components render.
    max: 10,
    keepAlive: true,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    // Supabase's session pooler occasionally pauses/resumes; allow the driver
    // to re-establish rather than surfacing "connection terminated".
    allowExitOnIdle: false,
  });

// Swallow idle-client errors so a dropped connection is quietly replaced by the
// pool instead of crashing the process or a render.
pool.on("error", (err) => {
  console.warn("[nova] pooled client error (connection will be replaced):", err.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
