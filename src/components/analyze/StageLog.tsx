"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleDashed, Loader2, Minus, X } from "lucide-react";
import { STEP_LABELS, type StepId } from "@/lib/analysis/types";
import type { StepState } from "./useStressTest";

const ICON = {
  pending: <CircleDashed className="h-4 w-4 text-muted/50" aria-hidden />,
  active: <Loader2 className="h-4 w-4 animate-spin text-cyan" aria-hidden />,
  done: <Check className="h-4 w-4 text-pass" aria-hidden />,
  skipped: <Minus className="h-4 w-4 text-muted" aria-hidden />,
  failed: <X className="h-4 w-4 text-block" aria-hidden />,
};

export function StageLog({ order, steps }: { order: StepId[]; steps: Record<StepId, StepState> }) {
  const visible = order.filter((id) => steps[id].status !== "pending");
  return (
    <ol className="num space-y-2 text-[13px]" aria-live="polite">
      <AnimatePresence initial={false}>
        {visible.map((id) => {
          const s = steps[id];
          return (
            <motion.li
              key={id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2.5"
            >
              <span className="mt-0.5">{ICON[s.status]}</span>
              <span className={s.status === "active" ? "text-ink" : "text-muted"}>
                {STEP_LABELS[id]}
                {s.status === "skipped" && " skipped"}
                {s.detail && <span className="block text-[11px] text-muted/80 break-words">{s.detail}</span>}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
