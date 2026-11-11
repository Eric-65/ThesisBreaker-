import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isDbConfigured } from "@/db/client";
import {
  REF_COOKIE,
  REF_MAX_AGE_S,
  SEEN_COOKIE,
  SESSION_WINDOW_S,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE_S,
  cookieOptions,
  isBot,
  isValidVisitorId,
  normalizeRefCode,
  recordVisit,
} from "@/lib/visitor/shared";

/**
 * Anonymous visitor tracking.
 * - First visit: issue `tb_vid` (random UUID). It is also written onto the
 *   forwarded request so the page / API handling this same request sees it.
 * - Session start (no `tb_seen`): upsert the user row in the background.
 * - `?ref=CODE`: remember the invite code for 30 days (httpOnly) so it is still
 *   there when the visitor comes back from Google. Only the shape is checked
 *   here; the code is validated against the database when an account is created.
 * - Bots and crawlers are skipped entirely. No IP address is read or stored here.
 */
export function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isBot(req.headers.get("user-agent"))) return NextResponse.next();

  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isValidVisitorId(existing) ? existing : crypto.randomUUID();
  const isNew = visitorId !== existing;
  const sessionStart = isNew || !req.cookies.has(SEEN_COOKIE);

  if (isNew) req.cookies.set(VISITOR_COOKIE, visitorId);
  const res = NextResponse.next({ request: { headers: req.headers } });

  if (isNew) res.cookies.set(VISITOR_COOKIE, visitorId, cookieOptions(VISITOR_MAX_AGE_S));
  const ref = normalizeRefCode(req.nextUrl.searchParams.get("ref"));
  if (ref) res.cookies.set(REF_COOKIE, ref, cookieOptions(REF_MAX_AGE_S));

  // Sliding window: a visit ends after 30 minutes without a request.
  res.cookies.set(SEEN_COOKIE, "1", cookieOptions(SESSION_WINDOW_S));

  if (sessionStart && isDbConfigured()) {
    event.waitUntil(
      recordVisit(visitorId).catch((err: Error) => console.error("[visitor] recordVisit failed:", err.message)),
    );
  }
  return res;
}

export const config = {
  matcher: [
    // Pages and app APIs. Skip static assets, Auth.js internals and the public,
    // CDN-cached endpoints (a Set-Cookie there would defeat caching).
    "/((?!_next/static|_next/image|images/|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/auth|api/stats|api/health).*)",
  ],
};
