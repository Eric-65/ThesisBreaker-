import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getSession } from "@/auth";
import { getDb, isDbConfigured } from "@/db";
import { VISITOR_COOKIE, isValidVisitorId } from "./shared";

export interface Identity {
  /** Row in `users` that new analyses are attributed to (null for bots / no DB). */
  userId: string | null;
  /** True when an Auth.js session is active. */
  signedIn: boolean;
  email: string | null;
  name: string | null;
  /**
   * True when this browser's anonymous id belongs to an account but there is no
   * session (signed out / expired). Writes still go to that row; reads of its
   * history require signing in.
   */
  needsSignIn: boolean;
  visitorId: string | null;
}

const NONE: Identity = { userId: null, signedIn: false, email: null, name: null, needsSignIn: false, visitorId: null };

export async function readVisitorId(): Promise<string | null> {
  const v = (await cookies()).get(VISITOR_COOKIE)?.value;
  return isValidVisitorId(v) ? v : null;
}

/** Resolve who is making this request: the signed-in account first, else the anonymous visitor. */
export async function currentIdentity(): Promise<Identity> {
  const visitorId = await readVisitorId();
  const session = await getSession();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      signedIn: true,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      needsSignIn: false,
      visitorId,
    };
  }
  if (!visitorId || !isDbConfigured()) return { ...NONE, visitorId };

  // The proxy normally creates the row at session start; this is the safety net.
  const res = await getDb().execute<{ id: string; email: string | null }>(sql`
    INSERT INTO users (visitor_id) VALUES (${visitorId})
    ON CONFLICT (visitor_id) DO UPDATE SET last_seen_at = now()
    RETURNING id, email
  `);
  const row = res.rows[0];
  return {
    userId: row?.id ?? null,
    signedIn: false,
    email: null,
    name: null,
    needsSignIn: Boolean(row?.email),
    visitorId,
  };
}

/**
 * Salted SHA-256 of the client IP, used only as an in-memory rate-limit key.
 * Raw IPs are never stored or logged.
 */
export function hashedClientIp(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const salt = process.env.IP_HASH_SALT || process.env.AUTH_SECRET || "thesisbreaker-dev-salt";
  return createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);
}
