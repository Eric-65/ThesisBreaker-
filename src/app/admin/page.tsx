import { sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminLogout, setUserInternal } from "@/app/actions/admin";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { getDb, isDbConfigured } from "@/db";
import { isAdmin, isAdminConfigured } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

interface Row extends Record<string, unknown> {
  id: string;
  email: string | null;
  name: string | null;
  display_name: string | null;
  is_internal: boolean;
  joined: Date;
  last_seen_at: Date;
  analyses: number;
  referral_count: number;
  referrer: string | null;
}

const stamp = (d: Date) => new Date(d).toISOString().slice(0, 16).replace("T", " ");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  // Without ADMIN_TOKEN the page does not exist.
  if (!isAdminConfigured()) notFound();

  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          <span className="metal-text">Restricted</span>
        </h1>
        <AdminLogin />
      </div>
    );
  }

  const { all } = await searchParams;
  const includeAnonymous = all === "1";
  let rows: Row[] = [];
  let problem: string | null = null;
  if (!isDbConfigured()) {
    problem = "DATABASE_URL is not set.";
  } else {
    try {
      const res = await getDb().execute<Row>(sql`
        SELECT
          u.id, u.email, u.name, u.display_name, u.is_internal,
          coalesce(u.joined_at, u.created_at) AS joined,
          u.last_seen_at,
          (SELECT count(*)::int FROM theses t WHERE t.user_id = u.id AND t.verdict IS NOT NULL) AS analyses,
          (SELECT count(*)::int FROM users c WHERE c.referred_by_user_id = u.id) AS referral_count,
          coalesce(r.email, r.name) AS referrer
        FROM users u
        LEFT JOIN users r ON r.id = u.referred_by_user_id
        WHERE ${includeAnonymous} OR u.email IS NOT NULL
        ORDER BY coalesce(u.joined_at, u.created_at) DESC
        LIMIT 500
      `);
      rows = res.rows;
    } catch (err) {
      console.error("[admin]", (err as Error).message);
      problem = "Could not load users — the database is unreachable.";
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            <span className="metal-text">Users</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            {rows.length} {includeAnonymous ? "users (accounts and anonymous visitors)" : "accounts"}
            {rows.length === 500 ? " — newest 500 shown" : ""}. Internal users are left out of every public number.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={includeAnonymous ? "/admin" : "/admin?all=1"} className="chip">
            {includeAnonymous ? "Accounts only" : "Include anonymous visitors"}
          </Link>
          <form action={adminLogout}>
            <button type="submit" className="chip">
              Lock
            </button>
          </form>
        </div>
      </div>

      {problem ? (
        <p role="alert" className="glass mt-8 p-5 text-sm">
          {problem}
        </p>
      ) : (
        <div className="glass mt-8 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                {["User", "Joined (UTC)", "Last seen (UTC)", "Analyses", "Referred by", "Referrals", "Internal"].map((h, i) => (
                  <th key={h} scope="col" className={`px-4 py-3 font-medium ${i === 3 || i === 5 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No users yet.
                  </td>
                </tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-line align-top">
                  <th scope="row" className="max-w-[16rem] px-4 py-3 font-normal">
                    <p className="truncate text-ink">{u.email ?? <span className="text-muted">Anonymous visitor</span>}</p>
                    {(u.name || u.display_name) && (
                      <p className="truncate text-xs text-muted">
                        {[u.name, u.display_name && `“${u.display_name}”`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </th>
                  <td className="num px-4 py-3 text-xs text-ink/90">{stamp(u.joined)}</td>
                  <td className="num px-4 py-3 text-xs text-ink/90">{stamp(u.last_seen_at)}</td>
                  <td className="num px-4 py-3 text-right">{u.analyses}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-xs text-ink/90">{u.referrer ?? "—"}</td>
                  <td className="num px-4 py-3 text-right">{u.referral_count}</td>
                  <td className="px-4 py-3">
                    <form action={setUserInternal}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="internal" value={String(!u.is_internal)} />
                      <button
                        type="submit"
                        role="switch"
                        aria-checked={u.is_internal}
                        aria-label={`Internal: ${u.email ?? "anonymous visitor"}`}
                        className={`inline-flex h-6 w-11 items-center rounded-full border p-0.5 transition-colors ${
                          u.is_internal ? "border-cyan/50 bg-cyan/25" : "border-line-strong bg-white/5"
                        }`}
                      >
                        <span
                          className={`h-4.5 w-4.5 rounded-full transition-transform ${
                            u.is_internal ? "translate-x-5 bg-cyan" : "bg-silver-lo"
                          }`}
                        />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
