"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Sparkles,
  XCircle,
} from "lucide-react";

interface Step {
  label: string;
  detail: string;
}

const STEPS: Step[] = [
  { label: "Thesis received", detail: "\u201CNVDA will rise because AI infrastructure demand keeps growing.\u201D" },
  { label: "Assumption extracted", detail: "AI infrastructure demand remains strong" },
  { label: "Counterargument constructed", detail: "Future growth may already be priced in" },
  { label: "Supporting evidence found", detail: "Hyperscaler capex commentary intact" },
  { label: "Contradictory evidence found", detail: "Valuation premium vs 5y median is elevated" },
  { label: "Thesis score: 78/100", detail: "Verdict: READY FOR PAPER TEST" },
];

/**
 * A self-running mini-demo on the landing page so a first-time visitor
 * understands the product in ~5 seconds without clicking anything.
 * Restarts once fully in view; pauses when out of view.
 */
export function MiniDemo() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: "-15% 0px" });
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setI(0);
    const t = setInterval(() => {
      setI((n) => {
        if (n >= STEPS.length - 1) {
          clearInterval(t);
          return n;
        }
        return n + 1;
      });
    }, 1100);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <section className="relative mx-auto max-w-7xl px-5 pb-8 pt-4 md:px-8" ref={ref}>
      <motion.div
        className="surface relative overflow-hidden p-5 md:p-6"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.10),transparent_60%)]" />
        <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#5e6472]">
              <Cpu size={12} className="text-[#ef4444]" /> Live Product Demo
            </div>
            <h3 className="mt-3 font-display text-3xl leading-[1.05] text-white md:text-4xl">
              Watch the agent break a real thesis.
            </h3>
            <p className="mt-3 max-w-md text-sm text-[#9aa1ae]">
              This is exactly what happens inside ThesisBreaker every time you submit an idea —
              extraction, red-team, evidence, and a scored verdict. No fabricated numbers, no
              guesses in the dark.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/new" className="btn btn-primary text-sm">
                Try Your Own Thesis <ArrowRight size={14} />
              </Link>
              <Link href="/new" className="btn btn-secondary text-sm">
                <Sparkles size={12} /> One-Click NVDA Demo
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-[#1e222c] bg-[#08090d] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#9aa1ae]">
                <span className="flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-[#ef4444] opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                </span>
                Agent: Challenging
              </div>
              <div className="text-[10px] text-[#5e6472]">NVDA · LONG · 3M</div>
            </div>
            <ul className="space-y-1.5">
              {STEPS.map((s, idx) => {
                const done = idx < i;
                const active = idx === i;
                const isSupport = idx === 3;
                const isContra = idx === 4;
                return (
                  <motion.li
                    key={s.label}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{
                      opacity: done || active ? 1 : 0.35,
                      x: 0,
                    }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs transition ${
                      active
                        ? "border-[#7f1d1d] bg-[#1a0808]/70"
                        : done
                          ? "border-[#0f2417] bg-[#062513]/40"
                          : "border-[#1e222c] bg-[#0a0c11]"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                        done
                          ? "border-[#166534] bg-[#0a2f19] text-[#86efac]"
                          : active
                            ? "border-[#7f1d1d] bg-[#210a0a] text-[#fca5a5]"
                            : "border-[#1e222c] text-[#5e6472]"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 size={10} />
                      ) : active ? (
                        "•"
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={
                          done ? "text-[#86efac]" : active ? "text-white" : "text-[#7a8091]"
                        }
                      >
                        {done ? `✓ ${s.label}` : s.label}
                        {active && (
                          <span className="ml-1 dot-anim text-[#ef4444]">
                            <span />
                            <span />
                            <span />
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#5e6472]">
                        {isSupport && <CheckCircle2 size={10} className="text-[#22c55e]" />}
                        {isContra && <XCircle size={10} className="text-[#ef4444]" />}
                        {s.detail}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
