"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { useState } from "react";
import type { ScoreBreakdown } from "@/lib/types";

interface Row {
  key: keyof ScoreBreakdown;
  label: string;
  color: string;
  what: string; // hover explanation
}

const ROWS: Row[] = [
  {
    key: "evidence",
    label: "Evidence Support",
    color: "#22c55e",
    what:
      "Weighted count of supporting evidence, scaled by confidence and impact. More primary-source signals earn more points.",
  },
  {
    key: "assumptions",
    label: "Assumption Strength",
    color: "#e7e9ee",
    what:
      "Fraction of your assumption weight that the agent classifies as SUPPORTED (fully) or UNCERTAIN (half). CHALLENGED assumptions score zero.",
  },
  {
    key: "contradictions",
    label: "Contradictions",
    color: "#ef4444",
    what:
      "Points remaining after contradictory evidence penalises the thesis. Fewer or weaker contradictions earn more points.",
  },
  {
    key: "risk",
    label: "Risk Definition",
    color: "#f5b400",
    what:
      "Rewards a well-scoped risk surface. HIGH-severity risks reduce the score more than LOW ones.",
  },
  {
    key: "invalidation",
    label: "Invalidation Clarity",
    color: "#9aa1ae",
    what:
      "How specifically the thesis defines what would prove it wrong. More explicit conditions earn more points.",
  },
];

export function ScoreExplainer({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="mt-5 rounded-lg border border-[#1e222c] bg-[#0a0c11]/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
          Score Breakdown
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#5e6472]">
          <Info size={10} /> Measures thesis quality, not probability of profit.
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
        {ROWS.map((r) => {
          const cell = breakdown[r.key];
          if (typeof cell === "number") return null;
          return <ScoreBar key={r.key} row={r} earned={cell.earned} max={cell.max as number} />;
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-[#5e6472]">
        <span>Total</span>
        <span className="tabular text-white">{breakdown.total} / 100</span>
      </div>
    </div>
  );
}

function ScoreBar({
  row,
  earned,
  max,
}: {
  row: Row;
  earned: number;
  max: number;
}) {
  const [hover, setHover] = useState(false);
  const pct = (earned / max) * 100;
  return (
    <div
      className="relative rounded-md border border-[#1e222c] bg-[#08090d] p-2.5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[#5e6472]">
        <span>{row.label}</span>
        <span className="tabular text-white">
          {earned}/{max}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#12141b]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: row.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>

      {hover && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute -top-2 left-2 z-10 w-56 -translate-y-full rounded-md border border-[#1e222c] bg-[#0b0d12]/95 p-2.5 text-[11px] leading-relaxed text-[#cbd0da] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] backdrop-blur"
        >
          {row.what}
        </motion.div>
      )}
    </div>
  );
}
