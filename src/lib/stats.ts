import "server-only";
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb, isDbConfigured } from "@/db";
import { ANONYMOUS_NAME } from "@/lib/referrals";

export interface PublicStats {
  /** Everyone who has used the app: anonymous visitors plus accounts. */
  users: number;
  /** Completed stress tests. */
  analyses: number;
  /** Users who came back for more than one visit. */
  returningUsers: number;
  /** Users with a signed-in account. */
  accounts: number;
  /** Users seen in the last 7 days. */
  activeUsers7d: number;
  /** Users first seen in the last 7 days. */
  newUsers7d: number;
  /** Accounts created from an invite link vs. without one. */
  joinedViaInvite: number;
  joinedDirect: number;
  verdicts: { PASS: number; REVISE: number; BLOCK: number };
  /** Last 30 days (UTC), oldest first. `users` is cumulative, `analyses` is per day. */
  growth: { date: string; users: number; analyses: number }[];
  /** Newest accounts. Name/avatar appear only for people who joined the community wall. */
  recentlyJoined: { name: string; anonymous: boolean; image: string | null; joinedAt: string }[];
  /** Top 10 by active referrals (referred accounts with at least one stress test). Opted-in users only. */
  topInviters: { name: string; image: string | null; activeReferrals: number }[];
  generatedAt: string;
}

const STATS_TTL_S = 60;
const n = (v: unknown) => Number(v ?? 0);

/**
 * Every figure is a live COUNT over real rows; users flagged `is_internal`
 * (and their stress tests and referrals) are excluded throughout. The only
 * personal data is the display name and avatar of people who opted in to the
 * community wall — never an email. Cached for 60 s.
 */
const cachedStats = unstable_cache(
  async (): Promise<PublicStats> => {
    const db = getDb();
    // A stress test counts when it finished (has a verdict) and its owner isn't internal.
    const realTests = sql`
      theses t LEFT JOIN users tu ON tu.id = t.user_id
      WHERE t.verdict IS NOT NULL AND coalesce(tu.is_internal, false) = false`;

    const [totals, verdicts, growth, recent, inviters] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT count(*) FROM users WHERE NOT is_internal) AS users,
          (SELECT count(*) FROM ${realTests}) AS analyses,
          (SELECT count(*) FROM users WHERE NOT is_internal AND visit_count > 1) AS returning_users,
          (SELECT count(*) FROM users WHERE NOT is_internal AND email IS NOT NULL) AS accounts,
          (SELECT count(*) FROM users WHERE NOT is_internal AND last_seen_at >= now() - interval '7 days') AS active_7d,
          (SELECT count(*) FROM users WHERE NOT is_internal AND created_at >= now() - interval '7 days') AS new_7d,
          (SELECT count(*) FROM users WHERE NOT is_internal AND email IS NOT NULL AND referred_by_user_id IS NOT NULL) AS via_invite
      `),
      db.execute(sql`SELECT t.verdict, count(*) AS n FROM ${realTests} GROUP BY t.verdict`),
      db.execute(sql`
        WITH days AS (
          SELECT generate_series(
            (now() AT TIME ZONE 'utc')::date - 29, (now() AT TIME ZONE 'utc')::date, interval '1 day'
          )::date AS day
        )
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS date,
          (SELECT count(*) FROM users u
            WHERE NOT u.is_internal AND (u.created_at AT TIME ZONE 'utc')::date <= d.day) AS users,
          (SELECT count(*) FROM ${realTests} AND (t.created_at AT TIME ZONE 'utc')::date = d.day) AS analyses
        FROM days d ORDER BY d.day
      `),
      db.execute(sql`
        SELECT
          CASE WHEN show_on_wall AND nullif(trim(display_name), '') IS NOT NULL THEN trim(display_name) END AS name,
          CASE WHEN show_on_wall AND nullif(trim(display_name), '') IS NOT NULL THEN image END AS image,
          coalesce(joined_at, created_at) AS joined_at
        FROM users
        WHERE NOT is_internal AND email IS NOT NULL
        ORDER BY coalesce(joined_at, created_at) DESC
        LIMIT 12
      `),
      db.execute(sql`
        SELECT trim(i.display_name) AS name, i.image, count(*) AS active_referrals
        FROM users i
        JOIN users r ON r.referred_by_user_id = i.id AND NOT r.is_internal
        WHERE NOT i.is_internal AND i.show_on_wall AND nullif(trim(i.display_name), '') IS NOT NULL
          AND EXISTS (SELECT 1 FROM theses t WHERE t.user_id = r.id AND t.verdict IS NOT NULL)
        GROUP BY i.id
        ORDER BY active_referrals DESC, min(coalesce(i.joined_at, i.created_at)) ASC
        LIMIT 10
      `),
    ]);

    const t = totals.rows[0] ?? {};
    const mix = { PASS: 0, REVISE: 0, BLOCK: 0 };
    for (const r of verdicts.rows) {
      if (r.verdict === "PASS" || r.verdict === "REVISE" || r.verdict === "BLOCK") mix[r.verdict] = n(r.n);
    }
    const accounts = n(t.accounts);
    const viaInvite = n(t.via_invite);
    return {
      users: n(t.users),
      analyses: n(t.analyses),
      returningUsers: n(t.returning_users),
      accounts,
      activeUsers7d: n(t.active_7d),
      newUsers7d: n(t.new_7d),
      joinedViaInvite: viaInvite,
      joinedDirect: accounts - viaInvite,
      verdicts: mix,
      growth: growth.rows.map((r) => ({ date: String(r.date), users: n(r.users), analyses: n(r.analyses) })),
      recentlyJoined: recent.rows.map((r) => ({
        name: typeof r.name === "string" ? r.name : ANONYMOUS_NAME,
        anonymous: typeof r.name !== "string",
        image: typeof r.image === "string" ? r.image : null,
        joinedAt: new Date(r.joined_at as string | Date).toISOString(),
      })),
      topInviters: inviters.rows.map((r) => ({
        name: String(r.name),
        image: typeof r.image === "string" ? r.image : null,
        activeReferrals: n(r.active_referrals),
      })),
      generatedAt: new Date().toISOString(),
    };
  },
  ["public-stats-v3"],
  { revalidate: STATS_TTL_S, tags: ["public-stats"] },
);

/** Null when the DB is not configured or unreachable — callers hide the numbers rather than show fake ones. */
export async function getPublicStats(): Promise<PublicStats | null> {
  if (!isDbConfigured()) return null;
  try {
    return await cachedStats();
  } catch (err) {
    console.error("[stats]", (err as Error).message);
    return null;
  }
}
