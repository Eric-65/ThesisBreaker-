"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Plus, RotateCcw, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SaveHistoryPrompt } from "@/components/auth/SaveHistoryPrompt";
import { EXAMPLE_IDEA } from "@/components/home/example";
import { ResultView } from "@/components/results/ResultView";
import { StageLog } from "./StageLog";
import { StreamPanel } from "./StreamPanel";
import { useStressTest } from "./useStressTest";

const EXAMPLES = [
  EXAMPLE_IDEA,
  "Short TSLA rToken into the delivery numbers — everyone is too bullish and the breakout above resistance will fail this week.",
  "Buy BTC now: the Fed will cut rates at the next FOMC and ETF inflows will push it to a new all-time high within 30 days.",
  "Long COIN rToken tonight because crypto volumes are surging and the stock lags BTC.",
  "Long ETH this month because spot ETF inflows are picking up and staking keeps more supply locked.",
  "Short MSTR rToken this week — it trades at too big a premium to its bitcoin holdings and BTC momentum is fading.",
  "Long AAPL rToken into earnings because iPhone demand will surprise and services revenue keeps growing.",
  "Buy SOL for 2 weeks because network activity is at a record and a spot ETF approval is close.",
  "Short SPY rToken before CPI — inflation will come in hot and the market is priced for rate cuts.",
  "Long PLTR rToken this quarter because new government contracts will drive another earnings beat.",
  "Long META rToken after earnings because ad revenue is accelerating and AI spending is paying off.",
  "Short DOGE this week — the meme rally has run out of new buyers and funding rates are too high.",
];

/** Examples shown before "More examples" is tapped (keeps the form short on phones). */
const VISIBLE_EXAMPLES = 6;

/** Short chip label: the part before the reasoning ("Long NVDA rToken over the weekend"). */
const chipLabel = (idea: string) => idea.split(/[—:]| because/)[0].trim();

const MAX = 1200;

export function Workbench() {
  const params = useSearchParams();
  const [idea, setIdea] = useState(() => params.get("idea")?.slice(0, MAX) ?? "");
  const [showAllExamples, setShowAllExamples] = useState(false);
  // Always show the picked example, even if it is in the collapsed part.
  const examples =
    showAllExamples || EXAMPLES.indexOf(idea) >= VISIBLE_EXAMPLES ? EXAMPLES : EXAMPLES.slice(0, VISIBLE_EXAMPLES);
  const t = useStressTest();
  const resultRef = useRef<HTMLDivElement>(null);
  const running = t.phase === "running";

  useEffect(() => {
    if (t.phase === "done") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [t.phase]);

  const submit = () => {
    const clean = idea.trim();
    if (clean.length < 8 || running) return;
    void t.run(clean);
  };

  return (
    <div className="space-y-8">
      <form
        className="glass p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="idea" className="text-sm font-semibold">
          Your trade idea, in plain English
        </label>
        <p id="idea-help" className="mt-1 text-xs text-muted">
          Include the asset, direction, timing and your reasons. Press ⌘/Ctrl + Enter to run.
        </p>
        <textarea
          id="idea"
          aria-describedby="idea-help"
          value={idea}
          maxLength={MAX}
          rows={4}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="e.g. Long NVDA rToken over the weekend because earnings will beat…"
          className="mt-3 w-full resize-y rounded-xl border border-line bg-bg/70 p-4 text-[15px] leading-relaxed text-ink placeholder:text-muted/60 focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
        />
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Example ideas">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip max-w-full text-left"
              aria-pressed={idea === ex}
              title={ex}
              onClick={() => setIdea(ex)}
            >
              <Sparkles className="h-3 w-3 shrink-0 text-cyan" aria-hidden />
              <span className="truncate">{chipLabel(ex)}</span>
            </button>
          ))}
          {examples.length < EXAMPLES.length && (
            <button
              type="button"
              className="chip text-muted"
              aria-expanded={false}
              onClick={() => setShowAllExamples(true)}
            >
              <Plus className="h-3 w-3 shrink-0" aria-hidden />
              {EXAMPLES.length - examples.length} more examples
            </button>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="num text-xs text-muted">
            {idea.length}/{MAX}
          </span>
          <div className="flex gap-2">
            {t.phase !== "idle" && !running && (
              <button type="button" className="btn btn-ghost" onClick={t.reset}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Reset
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={running || idea.trim().length < 8}>
              {running ? "Stress-testing…" : "Stress-test it"} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {(running || t.phase === "error" || (t.phase === "done" && t.result)) && (
          <motion.section
            key="stage"
            aria-label="Analysis progress"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`grid gap-4 ${running || t.streamTick > 0 ? "lg:grid-cols-[0.8fr_1.2fr]" : ""}`}
          >
            <div className="glass p-5">
              <p className="eyebrow">Analysis stage</p>
              <div className="mt-4">
                <StageLog order={t.stepOrder} steps={t.steps} />
              </div>
              {t.found.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Assumptions found</p>
                  <ul className="mt-2 space-y-1.5">
                    {t.found.map((f, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2 text-[13px] text-ink/85"
                      >
                        <span className="num text-xs text-cyan">A{i + 1}</span>
                        {f}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
              {t.error && (
                <p role="alert" className="mt-4 rounded-lg border border-block/40 bg-block/10 p-3 text-sm text-ink">
                  {t.error}
                </p>
              )}
            </div>
            {(running || t.streamTick > 0) && (
              <StreamPanel streamRef={t.streamRef} tick={t.streamTick} running={running} />
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <div ref={resultRef} className="scroll-mt-32">
        {t.phase === "done" && t.result && <ResultView result={t.result} />}
      </div>
      <SaveHistoryPrompt show={t.phase === "done" && Boolean(t.result?.id)} />
    </div>
  );
}
