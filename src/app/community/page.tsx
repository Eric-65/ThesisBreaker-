import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GrowthCharts } from "@/components/community/GrowthCharts";
import { RelativeTime } from "@/components/community/RelativeTime";
import { VerdictBadge } from "@/components/results/Badges";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { VERDICTS } from "@/lib/analysis/types";
import { getPublicStats } from "@/lib/stats";

// Same cached numbers as GET /api/stats; the page is regenerated at most once a minute.
export const revalidate = 60;
export const metadata: Metadata = {
  title: "Community",
  description: "Live ThesisBreaker traction: users, stress tests, growth, verdict mix and top inviters.",
};

const num = (v: number) => v.toLocaleString("en-US");
const VERDICT_BAR: Record<(typeof VERDICTS)[number], string> = { PASS: "bg-pass", REVISE: "bg-revise", BLOCK: "bg-block" };

export default async function CommunityPage() {
  const s = await getPublicStats();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">Community</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="metal-text">Live traction</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Every number on this page is counted from the database, refreshed about once a minute. Nothing is seeded or
        rounded up.
      </p>

      {!s ? (
        <div className="mt-8">
          <EmptyState title="Stats unavailable" body="The database can't be reached right now. Please check back shortly." cta={false} />
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(
              [
                ["Total users", s.users, `${num(s.accounts)} with an account`],
                ["Stress tests", s.analyses, "completed analyses"],
                ["Active users", s.activeUsers7d, "seen in the last 7 days"],
                ["New users", s.newUsers7d, "first seen in the last 7 days"],
              ] as const
            ).map(([label, value, hint]) => (
              <div key={label} className="glass p-4 sm:p-5">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="num mt-2 text-3xl font-semibold text-ink sm:text-4xl">{num(value)}</dd>
                <dd className="mt-1 text-xs text-muted">{hint}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="growth-title" className="mt-10">
            <h2 id="growth-title" className="text-lg font-semibold">
              Growth
            </h2>
            <div className="mt-4">
              <GrowthCharts data={s.growth} />
            </div>
          </section>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="joined-how-title" className="glass p-5">
              <h2 id="joined-how-title" className="text-sm font-semibold">
                How accounts joined
              </h2>
              <p className="mt-0.5 text-xs text-muted">Of {num(s.accounts)} signed-up accounts</p>
              <SplitBar
                rows={[
                  { label: "Via an invite link", value: s.joinedViaInvite, bar: "bg-cyan-deep" },
                  { label: "Directly", value: s.joinedDirect, bar: "bg-silver-lo" },
                ]}
              />
            </section>

            <section aria-labelledby="verdict-title" className="glass p-5">
              <h2 id="verdict-title" className="text-sm font-semibold">
                Verdict mix
              </h2>
              <p className="mt-0.5 text-xs text-muted">Across {num(s.analyses)} stress tests</p>
              <ul className="mt-4 space-y-3">
                {VERDICTS.map((v) => {
                  const count = s.verdicts[v];
                  const share = s.analyses > 0 ? (count / s.analyses) * 100 : 0;
                  return (
                    <li key={v} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
                      <VerdictBadge verdict={v} />
                      <div className="h-2 overflow-hidden rounded-full bg-white/5" aria-hidden>
                        <div className={`h-full rounded-full ${VERDICT_BAR[v]}`} style={{ width: `${share}%` }} />
                      </div>
                      <p className="num w-24 text-right text-sm text-ink">
                        {num(count)} <span className="text-xs text-muted">· {Math.round(share)}%</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="recent-title" className="glass p-5">
              <h2 id="recent-title" className="text-sm font-semibold">
                Recently joined
              </h2>
              <p className="mt-0.5 text-xs text-muted">Names appear only for people who chose to be shown.</p>
              {s.recentlyJoined.length === 0 ? (
                <p className="mt-6 text-sm text-muted">No one has created an account yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {s.recentlyJoined.map((u, i) => (
                    <li key={`${u.joinedAt}-${i}`} className="flex items-center gap-3 py-2.5">
                      <Avatar name={u.anonymous ? null : u.name} image={u.image} size={30} />
                      <p className="min-w-0 flex-1 truncate text-sm text-ink/90">{u.name}</p>
                      <p className="text-xs text-muted">
                        <RelativeTime iso={u.joinedAt} renderedAt={s.generatedAt} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="inviters-title" className="glass p-5">
              <h2 id="inviters-title" className="text-sm font-semibold">
                Top inviters
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Ranked by active referrals: invited people who ran at least one stress test.
              </p>
              {s.topInviters.length === 0 ? (
                <p className="mt-6 text-sm text-muted">
                  No active referrals yet. Sign in, share your invite link and join the wall to appear here.
                </p>
              ) : (
                <ol className="mt-4 divide-y divide-line">
                  {s.topInviters.map((u, i) => (
                    <li key={`${u.name}-${i}`} className="flex items-center gap-3 py-2.5">
                      <span className="num w-5 text-right text-xs text-muted">{i + 1}</span>
                      <Avatar name={u.name} image={u.image} size={30} />
                      <p className="min-w-0 flex-1 truncate text-sm text-ink/90">{u.name}</p>
                      <p className="num text-sm text-ink">
                        {num(u.activeReferrals)} <span className="text-xs text-muted">active</span>
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <div className="glass mt-10 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="font-semibold text-ink">Bring a trader with you</p>
              <p className="mt-1 text-sm text-muted">Every account gets a personal invite link and a referrals dashboard.</p>
            </div>
            <Link href="/invites" className="btn btn-primary shrink-0">
              Get my invite link <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            “Users” counts everyone who has opened the app (bots excluded), with or without an account. Team and test
            accounts are excluded from every figure. Raw data: <a href="/api/stats" className="underline hover:text-ink">/api/stats</a>.
          </p>
        </>
      )}
    </div>
  );
}

/** Two-part whole as one bar with a 2px gap; each part is labelled directly, so color is never the only cue. */
function SplitBar({ rows }: { rows: { label: string; value: number; bar: string }[] }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <div className="mt-4">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/5" aria-hidden>
        {total > 0 &&
          rows.filter((r) => r.value > 0).map((r) => <div key={r.label} className={`h-full rounded-full ${r.bar}`} style={{ flexGrow: r.value }} />)}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="flex items-center gap-2 text-xs text-muted">
              <span aria-hidden className={`h-2 w-2 rounded-sm ${r.bar}`} /> {r.label}
            </dt>
            <dd className="num mt-1 text-2xl font-semibold text-ink">
              {num(r.value)}{" "}
              <span className="text-xs font-normal text-muted">· {total > 0 ? Math.round((r.value / total) * 100) : 0}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
