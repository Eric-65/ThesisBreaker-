"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-28 md:px-8">
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-[#1e222c] bg-[linear-gradient(180deg,rgba(20,22,30,0.9),rgba(6,7,10,0.9))] px-6 py-16 text-center md:px-10 md:py-24"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-0 h-[400px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.18),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 -z-0 bg-grid opacity-30" />

        <div className="relative">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#5e6472]">
            The last step
          </div>
          <h2 className="font-display text-5xl leading-[0.98] text-white md:text-7xl">
            Don&rsquo;t just trust your trade.
            <br />
            <span className="text-[#ef4444]">Challenge it.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[#9aa1ae]">
            Built for traders who want evidence before execution.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/new" className="btn btn-primary text-base">
              Break Your First Thesis <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard" className="btn btn-secondary text-base">
              View Dashboard
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
