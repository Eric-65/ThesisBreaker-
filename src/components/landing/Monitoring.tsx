"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DATA = Array.from({ length: 20 }).map((_, i) => {
  const base = 86 - i * 0.9 + Math.sin(i / 2) * 3;
  return { day: `D${i + 1}`, score: Math.max(60, Math.min(90, Math.round(base))) };
});

export function Monitoring() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-24 md:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
            After the trade
          </div>
          <h2 className="font-display text-4xl leading-[1.05] text-white md:text-5xl">
            The thesis <span className="text-[#ef4444]">keeps getting tested.</span>
          </h2>
          <p className="mt-4 max-w-lg text-[#9aa1ae]">
            Once a paper trade is live, ThesisBreaker continuously compares your original
            assumptions against new information. If the case weakens, you&rsquo;ll know
            before the market tells you.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-[#1e222c] bg-[#0a0c11] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                Original Strength
              </div>
              <div className="font-display text-2xl font-semibold text-white">86</div>
            </div>
            <div className="rounded-lg border border-[#1e222c] bg-[#0a0c11] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                Current Strength
              </div>
              <div className="font-display text-2xl font-semibold text-[#f5b400]">68</div>
            </div>
            <div className="rounded-lg border border-[#1e222c] bg-[#0a0c11] px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                Δ 7-day
              </div>
              <div className="font-display text-2xl font-semibold text-[#ef4444]">−18</div>
            </div>
          </div>
        </div>

        <motion.div
          className="surface p-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="chip chip-bear">Thesis Weakening</span>
              <span className="text-[#5e6472]">NVDA</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#f5b400]">
              <AlertTriangle size={14} />
              2 assumptions weakening
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <AreaChart data={DATA} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mon-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#3b4252" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#3b4252" fontSize={10} tickLine={false} axisLine={false} domain={[50, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "#0b0d12",
                    border: "1px solid #1e222c",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#9aa1ae" }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#mon-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 rounded-lg border border-[#1e222c] bg-[#07080c] p-3 text-xs text-[#9aa1ae]">
            &ldquo;Two of your original assumptions are becoming less supported. Recommend
            re-challenge or trim size.&rdquo;
          </div>
        </motion.div>
      </div>
    </section>
  );
}
