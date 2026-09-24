"use client";

import { motion } from "framer-motion";
import { ScoreRing } from "../ScoreRing";
import { CountUp } from "../CountUp";

const STATS = [
  { label: "Assumptions", value: 4, color: "#e7e9ee" },
  { label: "Supported", value: 3, color: "#22c55e" },
  { label: "Unresolved", value: 1, color: "#f5b400" },
  { label: "Risk Factors", value: 2, color: "#ef4444" },
];

export function ScoreSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-24 md:px-8">
      <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
            Verdict
          </div>
          <h2 className="font-display text-5xl leading-[1.02] text-white md:text-6xl">
            A single number
            <br /> that <span className="text-[#f5b400]">earns your capital.</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#9aa1ae]">
            Every thesis is scored against its own assumptions, evidence, and risk profile.
            Strong ideas move to paper. Weak ones go back for more evidence.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                className="rounded-lg border border-[#1e222c] bg-[#0a0c11] p-4"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                  {s.label}
                </div>
                <div
                  className="mt-1 font-display text-3xl font-semibold"
                  style={{ color: s.color }}
                >
                  <CountUp to={s.value} duration={1.2} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgba(245,180,0,0.16),transparent_60%)]" />
            <ScoreRing score={74} label="TESTABLE" />
          </div>
          <div className="text-center">
            <div className="chip chip-warn">NEEDS MORE EVIDENCE</div>
            <p className="mt-3 max-w-xs text-sm text-[#9aa1ae]">
              &ldquo;Your core thesis is plausible, but one important assumption remains
              weak.&rdquo;
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
