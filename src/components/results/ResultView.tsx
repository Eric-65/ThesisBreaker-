"use client";

import { motion } from "framer-motion";
import { Bot, Cpu, Database, Info, Lock } from "lucide-react";
import type { StressTestResult } from "@/lib/analysis/types";
import { AssumptionCard } from "./AssumptionCard";
import { FragilityChart } from "./FragilityChart";
import { MarketEvidence } from "./MarketEvidence";
import { VerdictPanel } from "./VerdictPanel";

export function EngineBadge({ r }: { r: Pick<StressTestResult, "engine" | "model" | "cached"> }) {
  if (r.engine === "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-revise/40 bg-revise/10 px-2 py-1 text-xs font-medium text-revise">
        <Cpu className="h-3.5 w-3.5" aria-hidden /> Offline heuristic · Qwen not used
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan/40 bg-cyan/10 px-2 py-1 text-xs font-medium text-cyan">
      <Bot className="h-3.5 w-3.5" aria-hidden /> Qwen · <span className="num">{r.model}</span>
      {r.cached && (
        <>
          <span aria-hidden>·</span> <Database className="h-3.5 w-3.5" aria-hidden /> cached
        </>
      )}
    </span>
  );
}

export function ResultView({ result }: { result: StressTestResult }) {
  const weakest = result.assumptions.find((a) => a.id === result.weakestAssumptionId);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <EngineBadge r={result} />
        {result.symbol && <span className="num rounded-md border border-line px-2 py-1">{result.symbol}</span>}
        <span className="rounded-md border border-line px-2 py-1 capitalize">{result.direction}</span>
        {result.horizon && <span className="rounded-md border border-line px-2 py-1">{result.horizon}</span>}
      </div>

      {result.notices.length > 0 && (
        <ul className="space-y-1.5">
          {result.notices.map((n) => (
            <li key={n} className="flex items-start gap-2 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden /> {n}
            </li>
          ))}
        </ul>
      )}

      <VerdictPanel verdict={result.verdict} fragility={result.fragility} weakest={weakest} summary={result.summary} />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.section
          className="glass p-5"
          aria-labelledby="chart-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 id="chart-heading" className="text-sm font-semibold">Fragility by assumption</h3>
          <p className="mb-3 text-xs text-muted">0 = solid, 100 = likely false within the trade window. Hover a bar for detail.</p>
          <FragilityChart assumptions={result.assumptions} weakestId={result.weakestAssumptionId} />
        </motion.section>
        <div className="space-y-6">
          <section className="glass p-5" aria-labelledby="mbt-heading">
            <h3 id="mbt-heading" className="text-sm font-semibold">What would have to be true</h3>
            <ol className="mt-3 space-y-2">
              {result.whatMustBeTrue.map((w, i) => (
                <li key={i} className="flex gap-3 text-sm leading-snug text-ink/90">
                  <span className="num mt-0.5 text-xs text-cyan">{String(i + 1).padStart(2, "0")}</span>
                  {w}
                </li>
              ))}
            </ol>
          </section>
          <MarketEvidence market={result.market} />
        </div>
      </div>

      <section aria-labelledby="assumptions-heading">
        <h3 id="assumptions-heading" className="mb-3 text-sm font-semibold">
          Assumptions <span className="num text-muted">({result.assumptions.length})</span>
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {result.assumptions.map((a, i) => (
            <AssumptionCard key={a.id} a={a} index={i} weakest={a.id === result.weakestAssumptionId} />
          ))}
        </div>
      </section>

      <div className="glass flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          ThesisBreaker never places orders. You decide what to do with this analysis.
        </p>
        <button type="button" disabled aria-disabled className="btn btn-ghost shrink-0 text-sm" title="Coming in Phase 2">
          <Lock className="h-4 w-4" aria-hidden /> Send to Bitget Agentic Account (paper) — Phase 2
        </button>
      </div>
    </div>
  );
}
