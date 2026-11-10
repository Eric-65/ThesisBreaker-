// No "server-only" import here: this module is also used by src/proxy.ts,
// which runs on the Node.js runtime but outside the React server graph.
// Application code should import from "@/db" instead.
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __thesisbreakerPool?: Pool;
  __thesisbreakerDb?: NodePgDatabase;
};

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Lazily connect so pages that don't touch the DB (and the analysis fallback)
 * keep working when DATABASE_URL is missing.
 */
export function getDb(): NodePgDatabase {
  if (globalForDb.__thesisbreakerDb) return globalForDb.__thesisbreakerDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = globalForDb.__thesisbreakerPool ?? new Pool({ connectionString, max: 5 });
  globalForDb.__thesisbreakerPool = pool;
  globalForDb.__thesisbreakerDb = drizzle(pool);
  return globalForDb.__thesisbreakerDb;
}
