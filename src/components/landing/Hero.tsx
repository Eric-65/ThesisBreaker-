"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HeroVisual } from "../HeroVisual";

export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="relative z-10">
          <motion.div
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2a2f3c] bg-[#0b0d12]/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9aa1ae]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
            AI-Powered Thesis Validation
          </motion.div>

          <motion.h1
            className="font-display text-[44px] leading-[0.98] tracking-tight text-white md:text-[68px]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          >
            Before you trade it,
            <br />
            try to <span className="italic text-[#ef4444]">break</span> it.
          </motion.h1>

          <motion.p
            className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#9aa1ae]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            ThesisBreaker challenges your trade ideas, tests the assumptions behind them,
            searches for contradictory evidence, and only then moves strong ideas into Alpaca
            paper trading.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          >
            <Link href="/new" className="btn btn-primary text-base">
              BREAK MY THESIS <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard" className="btn btn-secondary text-base">
              Open Dashboard
            </Link>
          </motion.div>

          <motion.div
            className="mt-10 flex items-center gap-3 text-xs text-[#5e6472]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <span className="h-px w-8 bg-[#2a2f3c]" />
            Built for traders who want evidence before execution.
          </motion.div>
        </div>

        <motion.div
          className="relative flex items-center justify-center lg:justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}
