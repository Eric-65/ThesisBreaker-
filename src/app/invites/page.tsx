import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { InviteLink } from "@/components/invites/InviteLink";
import { ProfileForm } from "@/components/invites/ProfileForm";
import { Avatar } from "@/components/ui/Avatar";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getInviteDashboard } from "@/lib/referrals";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My invites",
  description: "Your ThesisBreaker invite link and the people who joined through it.",
  robots: { index: false },
};

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function InvitesPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin?next=/invites");
  const userId = session.user.id;

  const [{ welcome }, data, [me]] = await Promise.all([
    searchParams,
    getInviteDashboard(userId),
    getDb()
      .select({ displayName: users.displayName, showOnWall: users.showOnWall, name: users.name })
      .from(users)
      .where(eq(users.id, userId)),
  ]);
  if (!data || !me) redirect("/signin?next=/invites");

  const stats: [string, number, string][] = [
    ["People joined", data.joined, "created an account from your link"],
    ["Active", data.active, "ran at least one stress test"],
    ["Stress tests", data.stressTests, "run by the people you invited"],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">My invites</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="metal-text">Invite traders</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Share your link. When someone creates an account through it, they show up here. Each person can be invited once.
      </p>

      {welcome && (
        <section aria-labelledby="welcome-title" className="glass relative mt-8 overflow-hidden p-5 sm:p-6">
          <div aria-hidden className="trace absolute inset-x-0 top-0" />
          <h2 id="welcome-title" className="text-lg font-semibold">
            Welcome{me.name ? `, ${me.name.split(" ")[0]}` : ""} — your account is ready
          </h2>
          <p className="mt-1 text-sm text-muted">
            Stress tests you ran in this browser are now saved to your account. Your invite link is below; you can also
            pick a display name and join the community wall (optional).
          </p>
          <div className="mt-5 border-t border-line pt-5">
            <ProfileForm displayName={me.displayName} showOnWall={me.showOnWall} suggestedName={me.name?.split(" ")[0]} />
          </div>
        </section>
      )}

      <section className="glass mt-6 p-5 sm:p-6">
        <InviteLink link={data.link} />
      </section>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="glass p-5">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="num mt-2 text-4xl font-semibold text-ink">{value.toLocaleString("en-US")}</dd>
            <dd className="mt-1 text-xs text-muted">{hint}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="referred-title" className="mt-10">
        <h2 id="referred-title" className="text-lg font-semibold">
          People you invited
        </h2>
        {data.referred.length === 0 ? (
          <p className="glass mt-4 px-5 py-8 text-center text-sm text-muted">
            No one has joined through your link yet. Copy it above and send it to a trader you know.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {data.referred.map((r) => (
              <li key={r.id} className="glass flex items-center gap-3 px-4 py-3">
                <Avatar name={r.anonymous ? null : r.name} image={r.image} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                  <p className="text-xs text-muted">
                    Joined <time dateTime={r.joinedAt}>{day.format(new Date(r.joinedAt))}</time>
                  </p>
                </div>
                {r.active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-pass/40 bg-pass/10 px-2.5 py-1 text-xs text-ink">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-pass" /> Active
                  </span>
                ) : (
                  <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">No stress test yet</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.joined > data.referred.length && (
          <p className="mt-3 text-xs text-muted">Showing the {data.referred.length} most recent.</p>
        )}
      </section>

      {!welcome && (
        <p className="mt-10 text-sm text-muted">
          Want your name on the community page?{" "}
          <Link href="/profile" className="text-cyan underline-offset-2 hover:underline">
            Set a display name in your profile.
          </Link>
        </p>
      )}
    </div>
  );
}
