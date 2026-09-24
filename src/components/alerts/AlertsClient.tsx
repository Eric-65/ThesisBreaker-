"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Filter } from "lucide-react";

interface EventItem {
  id: string;
  thesisId: string;
  symbol: string;
  assetType: string;
  kind: string;
  message: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  createdAt: string;
}

const FILTERS: { key: string; label: string; kinds?: string[] }[] = [
  { key: "all", label: "All" },
  {
    key: "weakening",
    label: "Weakening",
    kinds: ["ASSUMPTION_WEAKENED", "CONTRADICTION_DETECTED", "INVALIDATION_TRIGGERED"],
  },
  { key: "strengthening", label: "Strengthening", kinds: ["ASSUMPTION_STRENGTHENED"] },
  { key: "orders", label: "Paper Orders", kinds: ["PAPER_ORDER_SUBMITTED", "PAPER_ORDER_FILLED"] },
  { key: "rechallenges", label: "Re-challenges", kinds: ["THESIS_RE_CHALLENGED"] },
];

export function AlertsClient({ events }: { events: EventItem[] }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    const f = FILTERS.find((x) => x.key === filter);
    if (!f?.kinds) return events;
    return events.filter((e) => f.kinds!.includes(e.kind));
  }, [events, filter]);

  if (events.length === 0) {
    return (
      <div className="surface flex flex-col items-center gap-3 p-16 text-center">
        <Bell size={20} className="text-[#5e6472]" />
        <div className="max-w-md text-sm text-[#9aa1ae]">
          The alerts feed is quiet. Once you create theses and the agent monitors them, meaningful
          events will appear here.
        </div>
        <Link href="/new" className="btn btn-primary">
          Break Your First Thesis →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-[#5e6472]" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filter === f.key
                ? "border-[#2a2f3c] bg-white/[0.06] text-white"
                : "border-[#1e222c] bg-[#0a0c11] text-[#9aa1ae] hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((e, i) => {
          const color = eventColor(e.kind);
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Link
                href={`/thesis/${e.thesisId}`}
                className="surface surface-hover block p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color }}
                      >
                        {kindTitle(e.kind)}
                      </span>
                      {e.symbol && (
                        <span className="font-mono text-xs text-white">· {e.symbol}</span>
                      )}
                      {e.assetType && (
                        <span className="chip">{e.assetType.replace("_", " ")}</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-[#cbd0da]">{e.message}</div>
                    {e.scoreBefore != null && e.scoreAfter != null && e.scoreBefore !== e.scoreAfter && (
                      <div className="mt-1 text-[11px] tabular text-[#7a8091]">
                        Score {e.scoreBefore} →{" "}
                        <span
                          style={{
                            color:
                              e.scoreAfter >= e.scoreBefore ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {e.scoreAfter}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-[#5e6472]">
                      {new Date(e.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function kindTitle(k: string): string {
  return k
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function eventColor(kind: string): string {
  if (kind.includes("STRENGTHEN") || kind === "PAPER_ORDER_FILLED" || kind === "PAPER_ORDER_SUBMITTED")
    return "#22c55e";
  if (
    kind.includes("WEAKENED") ||
    kind === "CONTRADICTION_DETECTED" ||
    kind === "INVALIDATION_TRIGGERED"
  )
    return "#ef4444";
  if (kind === "THESIS_RE_CHALLENGED") return "#f5b400";
  return "#9aa1ae";
}
