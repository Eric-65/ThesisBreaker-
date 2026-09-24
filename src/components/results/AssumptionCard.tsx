"use client";

import { motion } from "framer-motion";
import { Minus, Plus, Target } from "lucide-react";
import type { Assumption } from "@/lib/analysis/types";
import { CountUp } from "@/components/ui/CountUp";
import { StatusBadge } from "./Badges";
import { FragilityBar } from "./FragilityBar";
import { CATEGORY_LABEL } from "./meta";

export function AssumptionCard({ a, index, weakest }: { a: Assumption; index: number; weakest: boolean }) {
  return (
    <motion.article
      className={`glass glass-hover flex h-full flex-col p-5 ${weakest ? "!border-cyan/50 shadow-[0_0_0_1px_rgba(0,224,240,0.15),0_12px_40px_-16px_rgba(0,224,240,0.4)]" : ""}`}
      initial={{ opacity: 0, y: 24, rotate: -1.5, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.25 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby={`${a.id}-text`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="num text-xs text-muted">{a.id}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{CATEGORY_LABEL[a.category]}</span>
        <StatusBadge status={a.status} />
        {weakest && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan/10 px-2 py-0.5 text-xs font-medium text-cyan">
            <Target className="h-3.5 w-3.5" aria-hidden /> Weakest link
          </span>
        )}
      </div>
      <p id={`${a.id}-text`} className="mt-3 text-[15px] leading-snug text-ink">
        {a.text}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <FragilityBar value={a.fragility} status={a.status} delay={0.35 + index * 0.12} />
        <span className="w-16 shrink-0 text-right text-sm">
          <CountUp to={a.fragility} className="text-ink" />
          <span className="num text-xs text-muted">/100</span>
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <EvidenceList title="Evidence for" items={a.evidenceFor} icon="plus" />
        <EvidenceList title="Evidence against" items={a.evidenceAgainst} icon="minus" />
      </div>
    </motion.article>
  );
}

function EvidenceList({ title, items, icon }: { title: string; items: string[]; icon: "plus" | "minus" }) {
  const Icon = icon === "plus" ? Plus : Minus;
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted">{title}</h4>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((e, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink/85">
              <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${icon === "plus" ? "text-pass" : "text-block"}`} aria-hidden />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-muted">None found.</p>
      )}
    </div>
  );
}
