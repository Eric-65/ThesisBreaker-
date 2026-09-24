"use client";

import { motion } from "framer-motion";
import type { AssumptionStatus } from "@/lib/analysis/types";
import { STATUS_META } from "./meta";

/** Fills to the score with a transform (scaleX), so it stays GPU-friendly. */
export function FragilityBar({ value, status, delay = 0 }: { value: number; status: AssumptionStatus; delay?: number }) {
  return (
    <div
      role="meter"
      aria-label="Fragility"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
    >
      <motion.div
        className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
        style={{ background: `linear-gradient(90deg, #00A3B4, ${STATUS_META[status].color})` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: value / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* threshold ticks at 40 (weak) and 70 (broken) */}
      <span aria-hidden className="absolute inset-y-0 left-[40%] w-px bg-bg/80" />
      <span aria-hidden className="absolute inset-y-0 left-[70%] w-px bg-bg/80" />
    </div>
  );
}
