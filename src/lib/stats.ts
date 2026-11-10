import "server-only";
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb, isDbConfigured } from "@/db";

export interface PublicStats {
  users: number;
  analyses: number;
  returningUsers: number;
}

const STATS_TTL_S = 60;

/** Aggregate counts only — real COUNT queries, no personal data. Cached for 60 s. */
const cachedStats = unstable_cache(
  async (): Promise<PublicStats> => {
    const res = await getDb().execute<{ users: string; analyses: string; returning_users: string }>(sql`
      SELECT
        (SELECT count(*) FROM users) AS users,
        (SELECT count(*) FROM theses WHERE verdict IS NOT NULL) AS analyses,
        (SELECT count(*) FROM users WHERE visit_count > 1) AS returning_users
    `);
    const r = res.rows[0];
    return {
      users: Number(r?.users ?? 0),
      analyses: Number(r?.analyses ?? 0),
      returningUsers: Number(r?.returning_users ?? 0),
    };
  },
  ["public-stats-v1"],
  { revalidate: STATS_TTL_S, tags: ["public-stats"] },
);

/** Null when the DB is not configured or unreachable — callers hide the counter rather than show a fake number. */
export async function getPublicStats(): Promise<PublicStats | null> {
  if (!isDbConfigured()) return null;
  try {
    return await cachedStats();
  } catch (err) {
    console.error("[stats]", (err as Error).message);
    return null;
  }
}
