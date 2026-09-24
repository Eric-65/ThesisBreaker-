"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Assumption } from "@/lib/types";

const STATUS_STYLE: Record<
  string,
  { color: string; label: string; bg: string; pulse: string }
> = {
  SUPPORTED: { color: "#22c55e", label: "SUPPORTED", bg: "rgba(34,197,94,0.08)", pulse: "pulse-green" },
  UNCERTAIN: { color: "#f5b400", label: "UNCERTAIN", bg: "rgba(245,180,0,0.08)", pulse: "pulse-amber" },
  CHALLENGED: { color: "#ef4444", label: "CHALLENGED", bg: "rgba(239,68,68,0.08)", pulse: "pulse-red" },
};

export function ExpandableAssumptionCard({ a, idx }: { a: Assumption; idx: number }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_STYLE[a.status];
  const impactColor =
    a.impact === "HIGH" ? "#ef4444" : a.impact === "MEDIUM" ? "#f5b400" : "#9aa1ae";

  return (
    <motion.div
      className={`rounded-lg border ${s.pulse}`}
      style={{ borderColor: "#1e222c", background: s.bg }}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + idx * 0.06 }}
    >
      <button
        className="flex w-full items-start gap-3 p-3.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-[10px] font-semibold tracking-widest">
            <span className="text-[#5e6472]">
              ASSUMPTION {String(idx + 1).padStart(2, "0")} · Weight {a.weight}
            </span>
            <div className="flex items-center gap-2">
              {a.impact && (
                <span
                  className="rounded px-1.5 py-0.5"
                  style={{ color: impactColor, background: `${impactColor}18` }}
                >
                  {a.impact} IMPACT
                </span>
              )}
              <span style={{ color: s.color }}>{s.label}</span>
            </div>
          </div>
          <div className="mt-1.5 text-sm text-white">{a.text}</div>
          <div className="mt-1.5 text-xs text-[#7a8091]">{a.reasoning}</div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-0.5 text-[#5e6472]"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t"
            style={{ borderColor: "#1e222c" }}
          >
            <div className="space-y-2.5 p-3.5">
              {a.evidence && (
                <DetailBlock label="EVIDENCE" color="#22c55e" body={a.evidence} />
              )}
              {a.counterargument && (
                <DetailBlock
                  label="COUNTERARGUMENT"
                  color="#ef4444"
                  body={a.counterargument}
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                <MiniPill label="Impact" value={a.impact ?? "—"} color={impactColor} />
                <MiniPill label="Weight" value={String(a.weight)} color="#9aa1ae" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailBlock({ label, color, body }: { label: string; color: string; body: string }) {
  return (
    <div className="rounded-md border border-[#1e222c] bg-[#0a0c11] p-2.5">
      <div
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </div>
      <div className="mt-1 text-xs text-[#cbd0da]">{body}</div>
    </div>
  );
}

function MiniPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border border-[#1e222c] bg-[#0a0c11] px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">{label}</div>
      <div className="mt-0.5 text-xs font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
