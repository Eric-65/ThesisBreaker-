// Shared by src/proxy.ts and server code — keep free of "server-only" and next/headers.
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/** Anonymous visitor id: random UUID, httpOnly, 1 year. */
export const VISITOR_COOKIE = "tb_vid";
/** Sliding 30-minute marker: when it is missing, a new visit (session) starts. */
export const SEEN_COOKIE = "tb_seen";
/** Invite code captured from `?ref=CODE`; survives the OAuth round-trip. */
export const REF_COOKIE = "tb_ref";
export const REF_MAX_AGE_S = 60 * 60 * 24 * 30;
/** No look-alike characters: 0/O, 1/I/L are excluded. */
export const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REF_CODE_LENGTH = 7;
const REF_RE = new RegExp(`^[${REF_ALPHABET}]{${REF_CODE_LENGTH}}$`);

/** Upper-cases and validates the shape of an invite code. Null when it can't be one. */
export function normalizeRefCode(v: string | undefined | null): string | null {
  if (typeof v !== "string") return null;
  const code = v.trim().toUpperCase();
  return REF_RE.test(code) ? code : null;
}

export const VISITOR_MAX_AGE_S = 60 * 60 * 24 * 365;
export const SESSION_WINDOW_S = 30 * 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidVisitorId(v: string | undefined | null): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

const BOT_RE =
  /bot|crawl|spider|slurp|scrape|archiver|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|discord|slack|skype|vkshare|w3c_validator|lighthouse|pagespeed|headlesschrome|phantomjs|prerender|preview|monitor|pingdom|uptime|statuscake|curl\/|wget|python-requests|python-urllib|aiohttp|httpx|go-http-client|okhttp|java\/|libwww|node-fetch|axios|undici|postman/i;

/** Crawlers, link unfurlers, monitors and scripted clients get no cookie and no user row. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 10) return true;
  return BOT_RE.test(userAgent);
}

/**
 * Session start: create the user row for this visitor or mark it as seen.
 * `visit_count` grows at most once per 30 minutes regardless of how often this
 * runs (all SET expressions read the row's previous values).
 */
export async function recordVisit(visitorId: string): Promise<void> {
  await getDb().execute(sql`
    INSERT INTO users (visitor_id) VALUES (${visitorId})
    ON CONFLICT (visitor_id) DO UPDATE SET
      visit_count = users.visit_count
        + CASE WHEN users.last_seen_at < now() - interval '30 minutes' THEN 1 ELSE 0 END,
      last_seen_at = now()
  `);
}
