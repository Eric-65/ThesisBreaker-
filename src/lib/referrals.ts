import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { REF_ALPHABET, REF_CODE_LENGTH, normalizeRefCode } from "@/lib/visitor/shared";

const DEFAULT_SITE_URL = "https://thesis-breaker-sigma.vercel.app";

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < REF_CODE_LENGTH; i++) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return code;
}

const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
};

/** Runs `write` with fresh codes until one doesn't collide (31^7 ≈ 27 billion combinations). */
export async function withUniqueReferralCode<T>(write: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write(generateReferralCode());
    } catch (err) {
      if (!isUniqueViolation(err) || attempt >= 4) throw err;
    }
  }
}

/** The account's invite code, creating one if it predates referral codes. */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db.select({ code: users.referralCode, email: users.email }).from(users).where(eq(users.id, userId));
  if (!row?.email) return null; // anonymous rows don't get invite links
  if (row.code) return row.code;
  await withUniqueReferralCode((code) =>
    db
      .update(users)
      .set({ referralCode: code })
      .where(and(eq(users.id, userId), isNull(users.referralCode))),
  );
  const [again] = await db.select({ code: users.referralCode }).from(users).where(eq(users.id, userId));
  return again?.code ?? null;
}

/**
 * Credit `rawCode`'s owner for a newly created account. Rules: the code must
 * exist, nobody refers themselves, and `referred_by_user_id` is written only
 * while it is still empty — so it is set once and never changes.
 */
export async function creditReferral(newUserId: string, rawCode: string | null | undefined): Promise<boolean> {
  const code = normalizeRefCode(rawCode);
  if (!code) return false;
  const db = getDb();
  const [referrer] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, code));
  if (!referrer || referrer.id === newUserId) return false;
  const updated = await db
    .update(users)
    .set({ referredByUserId: referrer.id })
    .where(and(eq(users.id, newUserId), isNull(users.referredByUserId)))
    .returning({ id: users.id });
  return updated.length > 0;
}

/** Origin used in invite links: SITE_URL, else the live site in production, else the current host (dev). */
export async function siteUrl(): Promise<string> {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return DEFAULT_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : DEFAULT_SITE_URL;
}

export const ANONYMOUS_NAME = "Anonymous trader";

/** What other people may see of a user: nothing unless they joined the wall. Never an email. */
export function publicIdentity(u: { displayName: string | null; showOnWall: boolean; image: string | null }) {
  const optedIn = u.showOnWall && Boolean(u.displayName?.trim());
  return { name: optedIn ? u.displayName!.trim() : ANONYMOUS_NAME, image: optedIn ? u.image : null, optedIn };
}

export interface InviteDashboard {
  code: string;
  link: string;
  joined: number;
  active: number;
  stressTests: number;
  referred: { id: string; name: string; anonymous: boolean; image: string | null; joinedAt: string; active: boolean; stressTests: number }[];
}

export async function getInviteDashboard(userId: string): Promise<InviteDashboard | null> {
  const code = await ensureReferralCode(userId);
  if (!code) return null;
  const db = getDb();
  const tests = sql<number>`(
    SELECT count(*)::int FROM theses t WHERE t.user_id = ${users.id} AND t.verdict IS NOT NULL
  )`;
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      showOnWall: users.showOnWall,
      image: users.image,
      joinedAt: sql<Date>`coalesce(${users.joinedAt}, ${users.createdAt})`.mapWith(users.createdAt),
      stressTests: tests,
    })
    .from(users)
    .where(eq(users.referredByUserId, userId))
    .orderBy(desc(sql`coalesce(${users.joinedAt}, ${users.createdAt})`))
    .limit(200);

  const referred = rows.map((r) => {
    const pub = publicIdentity(r);
    return {
      id: r.id,
      name: pub.name,
      anonymous: !pub.optedIn,
      image: pub.image,
      joinedAt: r.joinedAt.toISOString(),
      active: r.stressTests > 0,
      stressTests: r.stressTests,
    };
  });

  // Totals come from their own aggregate so they stay exact beyond the list limit.
  const totals = await db.execute<{ joined: number; active: number; stress_tests: number }>(sql`
    SELECT count(*)::int AS joined,
           count(*) FILTER (WHERE n > 0)::int AS active,
           coalesce(sum(n), 0)::int AS stress_tests
    FROM (
      SELECT (SELECT count(*) FROM theses t WHERE t.user_id = u.id AND t.verdict IS NOT NULL) AS n
      FROM users u WHERE u.referred_by_user_id = ${userId}
    ) r
  `);
  const t = totals.rows[0];
  return {
    code,
    link: `${await siteUrl()}/?ref=${code}`,
    joined: t?.joined ?? 0,
    active: t?.active ?? 0,
    stressTests: t?.stress_tests ?? 0,
    referred,
  };
}
