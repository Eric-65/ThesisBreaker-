import "server-only";
import { randomUUID } from "node:crypto";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq, isNull, sql } from "drizzle-orm";
import NextAuth, { type NextAuthConfig } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { cookies } from "next/headers";
import { getDb, isDbConfigured } from "@/db";
import { accounts, qwenCalls, sessions, theses, users, verificationTokens, type User } from "@/db/schema";
import {
  SEEN_COOKIE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE_S,
  cookieOptions,
  isValidVisitorId,
} from "@/lib/visitor/shared";

/** Which sign-in methods are configured. All values are server-only env vars. */
export function authProviders() {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    email: Boolean(process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM),
  };
}

/** Sign-in is optional: it switches on only when the secret, the DB and at least one provider exist. */
export function isAuthEnabled(): boolean {
  const p = authProviders();
  return Boolean(process.env.AUTH_SECRET && isDbConfigured() && (p.google || p.email));
}

async function visitorCookie(): Promise<string | null> {
  try {
    const v = (await cookies()).get(VISITOR_COOKIE)?.value;
    return isValidVisitorId(v) ? v : null;
  } catch {
    return null;
  }
}

async function setVisitorCookie(visitorId: string): Promise<void> {
  try {
    const jar = await cookies();
    jar.set(VISITOR_COOKIE, visitorId, cookieOptions(VISITOR_MAX_AGE_S));
    jar.delete(SEEN_COOKIE);
  } catch (err) {
    console.error("[auth] could not set visitor cookie:", (err as Error).message);
  }
}

function toAdapterUser(row: User): AdapterUser {
  return {
    id: row.id,
    email: row.email ?? "",
    emailVerified: row.emailVerified,
    name: row.name,
    image: row.image,
  };
}

/**
 * Drizzle adapter with one change: a brand-new account claims the current
 * anonymous visitor row (same `users.id`, email attached) instead of creating
 * a second row, so every analysis already made in this browser stays put.
 */
function buildAdapter(): Adapter {
  const db = getDb();
  const base = DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  });
  return {
    ...base,
    async createUser(data) {
      const profile = {
        email: data.email,
        name: data.name ?? null,
        image: data.image ?? null,
        emailVerified: data.emailVerified ?? null,
      };
      const vid = await visitorCookie();
      if (vid) {
        const [claimed] = await db
          .update(users)
          .set(profile)
          .where(and(eq(users.visitorId, vid), isNull(users.email)))
          .returning();
        if (claimed) return toAdapterUser(claimed);
      }
      // No anonymous row to claim (cookie blocked, or this browser's row already
      // belongs to another account): start a fresh row.
      const [created] = await db
        .insert(users)
        .values({ ...profile, visitorId: vid ?? randomUUID() })
        .onConflictDoNothing({ target: users.visitorId })
        .returning();
      if (created) return toAdapterUser(created);
      const [fresh] = await db
        .insert(users)
        .values({ ...profile, visitorId: randomUUID() })
        .returning();
      return toAdapterUser(fresh);
    },
  };
}

/**
 * Existing account signing in from a browser that has its own anonymous row:
 * move that row's analyses onto the account, drop the anonymous row, and point
 * this browser's cookie at the account's visitor id.
 */
async function mergeAnonymousInto(userId: string): Promise<void> {
  const vid = await visitorCookie();
  if (!vid) return;
  const db = getDb();
  const [account] = await db.select().from(users).where(eq(users.id, userId));
  if (!account) return;
  if (account.visitorId === vid) return;

  await db.transaction(async (tx) => {
    const [anon] = await tx
      .select()
      .from(users)
      .where(and(eq(users.visitorId, vid), isNull(users.email)))
      .for("update");
    if (!anon) return;
    await tx.update(theses).set({ userId }).where(eq(theses.userId, anon.id));
    await tx.update(qwenCalls).set({ userId }).where(eq(qwenCalls.userId, anon.id));
    await tx
      .update(users)
      .set({
        createdAt: sql`least(${users.createdAt}, ${anon.createdAt.toISOString()}::timestamptz)`,
        lastSeenAt: sql`now()`,
      })
      .where(eq(users.id, userId));
    await tx.delete(users).where(eq(users.id, anon.id));
  });
  await setVisitorCookie(account.visitorId);
}

const lazyConfig = (): NextAuthConfig => {
  const p = authProviders();
  return {
    adapter: buildAdapter(),
    session: { strategy: "database" },
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    providers: [
      ...(p.google
        ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
        : []),
      ...(p.email ? [Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_EMAIL_FROM })] : []),
    ],
    pages: { signIn: "/signin", verifyRequest: "/signin?check=1", error: "/signin" },
    callbacks: {
      session({ session, user }) {
        if (session.user && user?.id) session.user.id = user.id;
        return session;
      },
    },
    events: {
      async signIn({ user }) {
        if (!user.id) return;
        try {
          await mergeAnonymousInto(user.id);
        } catch (err) {
          console.error("[auth] anonymous merge failed:", (err as Error).message);
        }
      },
      async signOut() {
        // Give this browser a fresh anonymous identity so the next person on a
        // shared computer doesn't add analyses to the signed-out account.
        await setVisitorCookie(randomUUID());
      },
    },
  };
};

export const { handlers, auth, signIn, signOut } = NextAuth(lazyConfig);

/** The signed-in session, or null when sign-in is disabled / unavailable. Never throws. */
export async function getSession() {
  if (!isAuthEnabled()) return null;
  try {
    const s = await auth();
    return s?.user?.id ? s : null;
  } catch (err) {
    console.error("[auth] session lookup failed:", (err as Error).message);
    return null;
  }
}
