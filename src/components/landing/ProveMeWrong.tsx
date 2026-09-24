"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { CountUp } from "../CountUp";

const CHALLENGES = [
  {
    icon: CheckCircle2,
    color: "#22c55e",
    label: "Supporting Evidence",
    n: 3,
    example: "Estimate revisions trending up. Sector ETF flows positive.",
  },
  {
    icon: XCircle,
    color: "#ef4444",
    label: "Contradictory Evidence",
    n: 1,
    example: "Guidance beat magnitude decelerating quarter over quarter.",
  },
  {
    icon: HelpCircle,
    color: "#f5b400",
    label: "Weak Assumptions",
    n: 1,
    example: "Assumes pricing power holds despite peer discounting.",
  },
  {
    icon: AlertTriangle,
    color: "#ef4444",
    label: "Invalidation Conditions",
    n: 2,
    example: "Close below 200-DMA on above-average volume.",
  },
];

export function ProveMeWrong() {
  return (
    <section id="prove" className="relative mx-auto max-w-7xl px-5 py-24 md:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        {/* LEFT */}
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#ef4444]">
            The Red Team
          </div>
          <h2 className="font-display text-5xl leading-[0.98] text-white md:text-6xl">
            PROVE ME
            <br />
            <span className="text-[#ef4444]">WRONG.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#9aa1ae]">
            Most trading tools try to confirm your idea. ThesisBreaker does the opposite —
            hunting for the counterargument, the weak assumption, and the invalidation you
            missed.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="chip chip-bear">Challenge</span>
            <span className="chip chip-warn">Uncertainty</span>
            <span className="chip chip-bull">Evidence</span>
            <span className="chip">Invalidation</span>
          </div>
        </div>

        {/* RIGHT — thesis card */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(circle_at_60%_30%,rgba(239,68,68,0.15),transparent_60%)]" />
          <motion.div
            className="surface p-6 md:p-7"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e222c] bg-[#0b0d12] text-sm font-bold">
                  NV
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">NVDA</div>
                  <div className="text-xs text-[#5e6472]">Bullish Thesis · 3–6M</div>
                </div>
              </div>
              <span className="chip chip-bull">LONG</span>
            </div>
            <p className="mt-5 rounded-lg border border-[#1e222c] bg-[#07080c] p-4 text-[15px] leading-relaxed text-[#cbd0da]">
              &ldquo;AI infrastructure demand will continue driving revenue growth, and NVIDIA
              maintains pricing power against new competition.&rdquo;
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {CHALLENGES.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.div
                    key={c.label}
                    className="rounded-lg border border-[#1e222c] bg-[#0a0c11] p-4"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                        {c.label}
                      </span>
                      <Icon size={14} style={{ color: c.color }} />
                    </div>
                    <div className="mt-2 font-display text-3xl font-semibold text-white">
                      <CountUp to={c.n} duration={1.2} />
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#7a8091]">{c.example}</p>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-dashed border-[#2a2f3c] bg-[#07080c] px-4 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                  Red Team Verdict
                </div>
                <div className="mt-1 text-sm text-white">
                  Plausible, but assumption on <span className="text-[#f5b400]">pricing power</span>{" "}
                  remains weak.
                </div>
              </div>
              <div className="font-display text-3xl font-semibold text-[#f5b400]">
                <CountUp to={74} duration={1.6} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
