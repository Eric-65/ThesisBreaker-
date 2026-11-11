import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "tb_admin";
export const ADMIN_PATH = "/admin";
const ADMIN_MAX_AGE_S = 8 * 60 * 60;
const MIN_TOKEN_LENGTH = 16;

const token = () => process.env.ADMIN_TOKEN?.trim() ?? "";

/** Admin is off unless ADMIN_TOKEN is set to something long enough to resist guessing. */
export function isAdminConfigured(): boolean {
  return token().length >= MIN_TOKEN_LENGTH;
}

const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/** The cookie holds an HMAC keyed by the token, never the token itself; rotating ADMIN_TOKEN signs everyone out. */
const sessionValue = () => createHmac("sha256", token()).update("thesisbreaker-admin-session-v1").digest("hex");

export function isAdminToken(candidate: string): boolean {
  return isAdminConfigured() && safeEqual(candidate.trim(), token());
}

/** Server-side gate used by the admin page and by every admin action. */
export async function isAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(v) && safeEqual(v!, sessionValue());
}

export async function startAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: ADMIN_PATH,
    maxAge: ADMIN_MAX_AGE_S,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { path: ADMIN_PATH, maxAge: 0 });
}
