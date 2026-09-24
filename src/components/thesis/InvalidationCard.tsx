"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Circle, ShieldAlert, ShieldCheck } from "lucide-react";
import type { InvalidationCondition, InvalidationStatus } from "@/lib/types";

const STATUS: Record<
  InvalidationStatus,
  { color: string; label: string; bg: string; Icon: typeof Circle }
> = {
  NOT_TRIGGERED: {
    color: "#22c55e",
    label: "NOT TRIGGERED",
    bg: "rgba(34,197,94,0.05)",
    Icon: ShieldCheck,
  },
  WATCHING: {
    color: "#f5b400",
    label: "WATCHING",
    bg: "rgba(245,180,0,0.06)",
    Icon: AlertTriangle,
  },
  TRIGGERED: {
    color: "#ef4444",
    label: "TRIGGERED",
    bg: "rgba(239,68,68,0.08)",
    Icon: ShieldAlert,
  },
};

/**
 * "What would prove you wrong?" — a first-class product feature.
 * Every explicit invalidation condition gets its own status card.
 */
export function InvalidationCard({ conditions }: { conditions: InvalidationCondition[] }) {
  return (
    <motion.div
      className="surface p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9aa1ae]">
        What Would Prove You Wrong?
      </div>
      <div className="mb-4 text-xs text-[#5e6472]">
        Each condition is a specific, testable event that would invalidate the thesis. The agent
        monitors these — it does <span className="text-[#ef4444]">not</span> auto-close positions.
      </div>
      <ul className="space-y-2">
        {conditions.map((c, i) => {
          const s = STATUS[c.status];
          const Icon = s.Icon;
          return (
            <motion.li
              key={c.id}
              className="rounded-lg border p-3"
              style={{ borderColor: "#1e222c", background: s.bg }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                  style={{ borderColor: `${s.color}44`, background: `${s.color}12`, color: s.color }}
                >
                  <Icon size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{c.text}</div>
                  <div className="mt-1 text-[11px] text-[#7a8091]">{c.detail}</div>
                </div>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: s.color, background: `${s.color}18`, whiteSpace: "nowrap" }}
                >
                  {s.label}
                </span>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
