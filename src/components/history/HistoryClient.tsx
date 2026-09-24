"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Filter, Swords } from "lucide-react";

interface Item {
  id: string;
  symbol: string;
  direction: string;
  initialScore: number;
  currentScore: number;
  status: string;
  verdict: string;
  createdAt: string;
  originalText: string;
}

const FILTERS = ["All", "Validated", "Needs Evidence", "Rejected", "Paper Traded"];

export function HistoryClient({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState("All");

  const filtered = useMemo(() => {
    if (filter === "All") return items;
    return items.filter((i) => {
      if (filter === "Paper Traded") return i.status === "PAPER_TRADED";
      if (filter === "Validated") return i.verdict === "VALIDATED_FOR_PAPER_TEST";
      if (filter === "Rejected") return i.verdict === "REJECTED" || i.verdict === "THESIS_TOO_FRAGILE";
      if (filter === "Needs Evidence") return i.verdict === "NEEDS_MORE_EVIDENCE";
      return true;
    });
  }, [items, filter]);

  if (items.length === 0) {
    return (
      <div className="surface flex flex-col items-center gap-3 p-16 text-center">
        <div className="text-sm text-[#9aa1ae]">No theses yet.</div>
        <Link href="/new" className="btn btn-primary">
          <Swords size={14} /> Break Your First Thesis
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
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filter === f
                ? "border-[#2a2f3c] bg-white/[0.06] text-white"
                : "border-[#1e222c] bg-[#0a0c11] text-[#9aa1ae] hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="relative">
        {/* vertical rail */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#1e222c] to-transparent md:left-6" />

        <ul className="space-y-4">
          {filtered.map((it, i) => {
            const trend = it.currentScore - it.initialScore;
            const dir = trend > 0 ? "up" : trend < 0 ? "down" : "flat";
            const dot =
              it.verdict === "VALIDATED_FOR_PAPER_TEST"
                ? "#22c55e"
                : it.verdict === "REJECTED" || it.verdict === "THESIS_TOO_FRAGILE"
                  ? "#ef4444"
                  : "#f5b400";
            return (
              <motion.li
                key={it.id}
                className="relative pl-12 md:pl-16"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span
                  className="absolute left-2.5 top-6 h-3 w-3 rounded-full ring-4 ring-[#06070a] md:left-[18px]"
                  style={{ background: dot }}
                />
                <div className="surface surface-hover p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e222c] bg-[#0b0d12] font-mono text-xs font-bold">
                      {it.symbol.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm font-semibold text-white">{it.symbol}</div>
                        <span
                          className={it.direction === "long" ? "chip chip-bull" : "chip chip-bear"}
                        >
                          {it.direction.toUpperCase()}
                        </span>
                        <StatusChip status={it.status} verdict={it.verdict} />
                      </div>
                      <div className="text-[11px] text-[#5e6472]">
                        {new Date(it.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-4 tabular text-sm">
                      <div>
                        <span className="text-[#5e6472]">Initial </span>
                        <span className="text-[#cbd0da]">{it.initialScore}</span>
                      </div>
                      <div className="text-[#5e6472]">→</div>
                      <div>
                        <span className="text-[#5e6472]">Current </span>
                        <span className="text-white">{it.currentScore}</span>
                      </div>
                      <div
                        className={
                          dir === "up"
                            ? "text-[#22c55e]"
                            : dir === "down"
                              ? "text-[#ef4444]"
                              : "text-[#5e6472]"
                        }
                      >
                        {dir === "up" ? "Strengthening" : dir === "down" ? "Weakening" : "Stable"}
                      </div>
                      <Link
                        href={`/thesis/${it.id}`}
                        className="btn btn-secondary text-xs"
                      >
                        Open <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 rounded-md border border-[#1e222c] bg-[#07080c] p-3 text-xs text-[#9aa1ae]">
                    &ldquo;{it.originalText}&rdquo;
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StatusChip({ status, verdict }: { status: string; verdict: string }) {
  if (status === "PAPER_TRADED") return <span className="chip chip-bull">Paper Traded</span>;
  if (verdict === "VALIDATED_FOR_PAPER_TEST") return <span className="chip chip-bull">Validated</span>;
  if (verdict === "REJECTED") return <span className="chip chip-bear">Rejected</span>;
  if (verdict === "THESIS_TOO_FRAGILE") return <span className="chip chip-bear">Too Fragile</span>;
  return <span className="chip chip-warn">Needs Evidence</span>;
}
