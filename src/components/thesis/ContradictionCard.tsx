"use client";

import { motion } from "framer-motion";
import { AlertOctagon, HelpCircle, ShieldAlert } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";

/**
 * Prominent contradiction summary: N supporting / M contradictory / K unknown,
 * plus a callout for the single strongest contradiction the agent found.
 */
export function ContradictionCard({ analysis }: { analysis: AnalysisResult }) {
  const supporting = analysis.supportingEvidence.length;
  const contra = analysis.contradictoryEvidence.length;
  const unknown = analysis.uncertainEvidence.length;
  const strongest = analysis.strongestContradiction;

  return (
    <motion.div
      className="surface overflow-hidden p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9aa1ae]">
        <ShieldAlert size={14} className="text-[#ef4444]" /> Contradiction Detection
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Signal count={supporting} label="Supporting" color="#22c55e" />
        <Signal count={contra} label="Contradictory" color="#ef4444" />
        <Signal count={unknown} label="Unknown" color="#f5b400" />
      </div>

      {strongest ? (
        <div className="mt-4 rounded-lg border border-[#7f1d1d] bg-[#1a0808]/50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#fca5a5]">
            <AlertOctagon size={12} /> Strongest Contradiction
          </div>
          <div className="mt-2 text-sm text-white">{strongest}</div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "#ef4444", background: "#ef444418" }}
            >
              HIGH IMPACT
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#5e6472]">
              Why it matters: Your thesis&rsquo;s success depends on the assumption this signal challenges.
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-[#2a2f3c] p-3 text-xs text-[#5e6472]">
          <HelpCircle size={12} /> No dominant contradiction detected in the current pass.
        </div>
      )}
    </motion.div>
  );
}

function Signal({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="rounded-lg border border-[#1e222c] bg-[#0a0c11] p-3 text-center">
      <div className="font-display text-3xl font-semibold tabular" style={{ color }}>
        {count}
      </div>
      <div
        className="mt-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </div>
    </div>
  );
}
