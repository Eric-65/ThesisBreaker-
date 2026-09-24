import type { Metadata } from "next";
import { Reveal, RevealItem } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "About",
  description: "What ThesisBreaker does, how it works, its data sources and model, and the disclaimer.",
};

const SECTIONS = [
  {
    id: "thesis",
    title: "The thesis",
    body: [
      "Most trading tools answer “what happened in similar setups?” ThesisBreaker answers a different question: which of your assumptions is false right now?",
      "Every trade idea rests on a chain of beliefs — about fundamentals, price structure, timing, liquidity, macro and sentiment. A trade usually fails at its weakest link, and that link is rarely the one the trader was thinking about. ThesisBreaker is a pre-trade red team: it names those links and tries to break them before the market does.",
      "It is built for tokenized U.S. stocks on Bitget (rTokens), which trade 24/7 even when the U.S. cash market is closed, and for crypto. That off-hours gap creates assumptions — about tracking, liquidity and gaps — that are easy to miss.",
    ],
  },
  {
    id: "how",
    title: "How it works",
    body: [
      "1. You describe a trade idea in plain English.",
      "2. ThesisBreaker identifies the ticker and fetches live price evidence from Bitget: last price, 24h change and range, volume, spread, and the last 72 hourly candles.",
      "3. Qwen extracts 4–8 explicit, testable assumptions. Each gets evidence for, evidence against, a status (holds / weak / broken) and a 0–100 fragility score. Every model answer is validated against a strict schema before it is shown or saved.",
      "4. A verdict — PASS, REVISE or BLOCK — names the single weakest assumption and what would have to be true for the trade to work. Simple rules can escalate the model's verdict when the scores cross a threshold, but never soften it.",
      "5. The result is saved to your history. ThesisBreaker never places orders.",
    ],
  },
  {
    id: "data",
    title: "Data sources and model",
    body: [
      "Market data: Bitget public spot REST API v2 (tickers, candles, symbol list). Exchange symbols are verified against Bitget's live symbol list — they are never guessed.",
      "Model: Qwen (qwen3.8-max by default) via Bitget's OpenAI-compatible hackathon endpoint, called only from the server. Results for the same idea are cached for 24 hours to save credits, and token usage is logged.",
      "Offline mode: if the model is not configured or fails, a deterministic keyword-and-price heuristic produces a clearly labeled “offline heuristic” analysis instead.",
      "Coming in Phase 2: fundamentals, estimates and news via the Bitget Agent Hub MCP, and optional paper orders through a Bitget Agentic Account — always with a human confirmation.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    body: [
      "ThesisBreaker is a research tool, not financial advice. It does not recommend buying or selling any asset, and its verdicts describe the assumptions in an idea — not future prices.",
      "Model output can be wrong, incomplete or out of date. Background knowledge in the analysis is marked “[General knowledge]” and may be stale; only items marked “[Bitget market data]” come from live data. Tokenized stocks and crypto are volatile and can lose value quickly.",
      "AI analyzes; you decide. You are responsible for every trading decision you make.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">About</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="metal-text">A red team for</span> <span className="text-cyan">your trade ideas</span>
      </h1>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="chip">
            {s.title}
          </a>
        ))}
      </nav>
      <Reveal className="mt-10 space-y-6">
        {SECTIONS.map((s) => (
          <RevealItem key={s.id}>
            <section id={s.id} className="glass scroll-mt-32 p-6 sm:p-8" aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`} className="text-xl font-semibold">
                {s.title}
              </h2>
              <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/85">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          </RevealItem>
        ))}
      </Reveal>
    </div>
  );
}
