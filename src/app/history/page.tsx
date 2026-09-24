import type { Metadata } from "next";
import Link from "next/link";
import { isDbConfigured } from "@/db";
import { listHistory, type HistoryRow } from "@/lib/analysis/repo";
import { VERDICTS, type Verdict } from "@/lib/analysis/types";
import { VerdictBadge } from "@/components/results/Badges";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "History", description: "Past ThesisBreaker verdicts." };

const FILTERS: (Verdict | "ALL")[] = ["ALL", ...VERDICTS];

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ verdict?: string }> }) {
  const { verdict: raw } = await searchParams;
  const verdict = (VERDICTS as readonly string[]).includes(raw ?? "") ? (raw as Verdict) : undefined;

  let rows: HistoryRow[] = [];
  let problem: string | null = null;
  if (!isDbConfigured()) {
    problem = "History is disabled because DATABASE_URL is not set on this server.";
  } else {
    try {
      rows = await listHistory(verdict);
    } catch (err) {
      console.error("[history]", err);
      problem = "Could not load history — the database is unreachable.";
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">History</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="metal-text">Past verdicts</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">Every stress test is saved with its assumptions and the evidence it used.</p>

      <nav aria-label="Filter by verdict" className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (f === "ALL" && !verdict) || f === verdict;
          return (
            <Link
              key={f}
              href={f === "ALL" ? "/history" : `/history?verdict=${f}`}
              aria-current={active ? "page" : undefined}
              aria-pressed={active}
              className="chip num"
            >
              {f === "ALL" ? "All" : f}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        {problem ? (
          <EmptyState title="History unavailable" body={problem} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={verdict ? `No ${verdict} verdicts yet` : "No verdicts yet"}
            body="Run your first stress test and it will show up here."
          />
        ) : (
          <ul className="grid gap-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/history/${r.id}`}
                  className="glass glass-hover grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5 sm:p-5"
                >
                  <div className="flex items-center gap-3 sm:w-40 sm:flex-col sm:items-start sm:gap-1.5">
                    <VerdictBadge verdict={r.verdict} size="md" />
                    <span className="num text-xs text-muted">{r.symbol ?? "—"} · {r.fragility}/100</span>
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[15px] text-ink">{r.idea}</p>
                    {r.weakestAssumption && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted">
                        <span className="text-cyan">Weakest:</span> {r.weakestAssumption}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted sm:flex-col sm:items-end sm:gap-1">
                    <time dateTime={r.createdAt} className="num">
                      {new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                    </time>
                    <span>{r.engine === "qwen" ? "Qwen" : "Offline heuristic"}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
