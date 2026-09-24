import { ArrowRight, Target } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import crack from "../../../public/images/cracked-glass.webp";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { StatusBadge, VerdictBadge } from "@/components/results/Badges";
import { FragilityBar } from "@/components/results/FragilityBar";
import type { Assumption } from "@/lib/analysis/types";
import { EXAMPLE_IDEA } from "./example";

// Illustrative output only — not a live analysis and not a statement about any real security.
const SAMPLE: Assumption[] = [
  { id: "A1", text: "The NVDA rToken will track the stock over the weekend, with liquidity to exit near fair value.", category: "liquidity", status: "broken", fragility: 78, evidenceFor: [], evidenceAgainst: [] },
  { id: "A2", text: "The expected reversal happens by Monday, not merely eventually.", category: "timing", status: "weak", fragility: 66, evidenceFor: [], evidenceAgainst: [] },
  { id: "A3", text: "Earnings will beat and the beat is not already priced in.", category: "fundamental", status: "weak", fragility: 61, evidenceFor: [], evidenceAgainst: [] },
  { id: "A4", text: "The Friday dip is a pullback, not the start of a downtrend.", category: "technical", status: "holds", fragility: 38, evidenceFor: [], evidenceAgainst: [] },
];

export function SampleVerdict() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal className="grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <RevealItem>
          <p className="eyebrow">Sample verdict</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            One weak link is <span className="text-block">enough</span>.
          </h2>
          <p className="mt-4 text-muted">
            Every assumption gets evidence for and against, a status and a fragility score. The verdict names the single
            assumption most likely to break your trade — so you can fix it, size down, or walk away.
          </p>
          <Link href={`/analyze?idea=${encodeURIComponent(EXAMPLE_IDEA)}`} className="btn btn-ghost mt-6">
            Run this example <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </RevealItem>
        <RevealItem>
          <figure className="glass glass-hover relative overflow-hidden p-5 sm:p-6">
            <Image src={crack} alt="" placeholder="blur" fill sizes="(min-width: 768px) 55vw, 100vw" className="-z-10 object-cover opacity-30" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="num text-[11px] uppercase tracking-wider text-muted">Illustrative output</span>
              <VerdictBadge verdict="BLOCK" size="md" />
            </div>
            <blockquote className="mt-4 border-l-2 border-cyan/50 pl-3 text-sm text-ink/85">“{EXAMPLE_IDEA}”</blockquote>
            <div className="mt-5 rounded-xl border border-cyan/30 bg-cyan/[0.05] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-cyan">
                <Target className="h-3.5 w-3.5" aria-hidden /> Weakest assumption
              </p>
              <p className="mt-1 text-sm text-ink">{SAMPLE[0].text}</p>
            </div>
            <ul className="mt-5 space-y-3">
              {SAMPLE.map((a, i) => (
                <li key={a.id}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted">
                      <span className="num text-ink/70">{a.id}</span> · {a.category}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={a.status} />
                      <span className="num w-7 text-right text-ink">{a.fragility}</span>
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <FragilityBar value={a.fragility} status={a.status} delay={0.1 * i} />
                  </div>
                </li>
              ))}
            </ul>
          </figure>
        </RevealItem>
      </Reveal>
    </section>
  );
}
