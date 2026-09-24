"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Target } from "lucide-react";
import type { Assumption, Verdict } from "@/lib/analysis/types";
import { CountUp } from "@/components/ui/CountUp";
import { StatusBadge } from "./Badges";
import { CATEGORY_LABEL, VERDICT_META } from "./meta";

// Crack paths radiating from an impact point near the verdict word (viewBox 0 0 100 60).
const CRACKS = [
  "M22 26 L34 22 L41 24 L55 17 L63 18 L78 9 L100 4",
  "M22 26 L31 33 L37 32 L46 41 L58 44 L70 55 L76 60",
  "M22 26 L12 20 L7 21 L0 15",
  "M22 26 L17 36 L18 43 L10 60",
  "M41 24 L45 31 L52 33",
  "M58 44 L66 40 L74 42 L100 38",
];
const SHARDS = [
  { d: "M20 24 L25 22 L23 28 Z", x: -14, y: -10, r: -25 },
  { d: "M24 27 L29 26 L26 31 Z", x: 12, y: 14, r: 30 },
  { d: "M19 27 L22 30 L17 31 Z", x: -12, y: 12, r: 20 },
  { d: "M23 23 L27 20 L28 24 Z", x: 10, y: -14, r: -18 },
];

export function VerdictPanel({
  verdict,
  fragility,
  weakest,
  summary,
}: {
  verdict: Verdict;
  fragility: number;
  weakest: Assumption | undefined;
  summary: string;
}) {
  const m = VERDICT_META[verdict];
  const reduce = useReducedMotion();

  const cardMotion =
    verdict === "REVISE"
      ? { initial: { x: 0 }, animate: { x: [0, -10, 9, -6, 4, -2, 0] }, transition: { duration: 0.7, delay: 0.3 } }
      : verdict === "BLOCK"
        ? { initial: { scale: 1 }, animate: { scale: [1, 1, 0.985, 1] }, transition: { duration: 1.4, times: [0, 0.6, 0.72, 1] } }
        : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } };

  return (
    <motion.section
      aria-labelledby="verdict-heading"
      className="glass relative overflow-hidden p-6 sm:p-8"
      style={{ borderColor: `${m.color}55` }}
      {...(reduce ? {} : cardMotion)}
    >
      {/* PASS: cyan → green pulse rings */}
      {verdict === "PASS" && !reduce && (
        <div aria-hidden className="pointer-events-none absolute left-10 top-10 sm:left-14 sm:top-14">
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute -left-24 -top-24 h-48 w-48 rounded-full border-2"
              style={{ borderColor: i ? "#22C55E" : "#00E0F0" }}
              initial={{ scale: 0.3, opacity: 0.9 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.2 + i * 0.35, ease: "easeOut", repeat: 1 }}
            />
          ))}
        </div>
      )}

      {/* BLOCK: crack lines draw across the card, then a few shards shatter off */}
      {verdict === "BLOCK" && (
        <svg aria-hidden viewBox="0 0 100 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {CRACKS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke={i % 2 ? "#FF4D4F" : "#E6E8EB"}
              strokeOpacity={i % 2 ? 0.5 : 0.35}
              strokeWidth={0.35}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.07, ease: "easeOut" }}
            />
          ))}
          {!reduce &&
            SHARDS.map((s, i) => (
              <motion.path
                key={i}
                d={s.d}
                fill="#E6E8EB"
                fillOpacity={0.25}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
                animate={{ x: s.x, y: s.y, rotate: s.r, opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.9, delay: 0.85, ease: "easeOut" }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            ))}
        </svg>
      )}

      <div className="relative grid gap-6 md:grid-cols-[auto_1fr] md:items-start md:gap-10">
        <div>
          <p className="eyebrow">Verdict</p>
          <h2 id="verdict-heading" className={`num mt-2 text-5xl font-bold tracking-tight sm:text-6xl ${m.text}`}>
            {m.label}
          </h2>
          <p className="mt-2 max-w-[18rem] text-sm text-muted">{m.blurb}</p>
          <div className="mt-5 flex items-baseline gap-2">
            <CountUp to={fragility} className="text-3xl text-ink" />
            <span className="text-sm text-muted">/100 overall fragility</span>
          </div>
        </div>
        <div className="space-y-5">
          {weakest && (
            <div className="rounded-xl border border-cyan/30 bg-cyan/[0.05] p-4">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-cyan">
                <Target className="h-4 w-4" aria-hidden /> Weakest assumption · {weakest.id} · {CATEGORY_LABEL[weakest.category]}
              </p>
              <p className="mt-2 text-lg leading-snug text-ink">{weakest.text}</p>
              <p className="num mt-2 text-sm text-muted">
                fragility {weakest.fragility}/100 <span className="mx-1">·</span>
                <StatusBadge status={weakest.status} />
              </p>
            </div>
          )}
          <p className="text-[15px] leading-relaxed text-ink/85">{summary}</p>
        </div>
      </div>
    </motion.section>
  );
}
