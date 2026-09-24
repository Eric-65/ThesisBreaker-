# ThesisBreaker

**Break your thesis before the market does.** A pre-trade red team for tokenized U.S. stocks (Bitget rTokens, 24/7) and crypto.

A trader types a trade idea in plain English. ThesisBreaker extracts the hidden assumptions behind it, checks each one against evidence, and returns a verdict — **PASS / REVISE / BLOCK** — naming the weakest assumption. AI analyzes; the human decides.

Built for the Bitget AI Hackathon S2 · AI Trading Desk → Decision Stress Testing. Research tool, not financial advice.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 (CSS-first `@theme`) · Postgres + Drizzle · zod · framer-motion · recharts.

## Setup

```bash
cp .env.example .env.local      # fill in DATABASE_URL and (optionally) BITGET_QWEN_API_KEY
npm install
npm run db:migrate              # applies drizzle/*.sql
npm run dev
```

| Variable | Purpose |
|---|---|
| `BITGET_QWEN_API_KEY` | Key for Bitget's Qwen endpoint. Empty → offline heuristic mode. Server-only. |
| `QWEN_BASE_URL` | OpenAI-compatible base URL (default `https://hackathon.bitgetops.com/v1`). |
| `QWEN_MODEL` | Default `qwen3.8-max`. |
| `QWEN_ENABLE_THINKING` | `true`/`false`. Thinking tokens are billed as output. |
| `QWEN_TIMEOUT_MS` | Per-request timeout, default `45000`. |
| `DATABASE_URL` | Postgres connection string. Without it, analysis still runs but history is off. |

No variable uses the `NEXT_PUBLIC_` prefix; nothing is exposed to the browser.

## How it works

- `POST /api/analyze` streams Server-Sent Events: step progress, market evidence, model deltas, and one final result.
- `src/lib/analysis/run.ts` — orchestration: parse → 24h cache lookup → Bitget price evidence → Qwen (streamed, zod-validated) → verdict guardrail → save.
- `src/lib/qwen.ts` — native `fetch` client: JSON mode and `enable_thinking` with automatic fallback if the endpoint rejects them, timeout, one retry on 5xx, SSE streaming, typed `QwenError`.
- `src/lib/analysis/heuristic.ts` — deterministic offline fallback, clearly labeled in the UI.
- `src/lib/market/` — `MarketDataProvider` interface + Bitget public spot v2 implementation. Symbols are resolved against Bitget's live symbol list, never guessed. `FundamentalsProvider` is the Phase 2 extension point.
- Token usage for every Qwen call (and cache hits) is logged in `qwen_calls`.

## Scripts

`npm run dev | build | start | lint | typecheck | db:generate | db:migrate | images`

`npm run images` regenerates the procedural brand images in `public/images/` (see `CREDITS.md`).

## Phase 2 (not in this build)

Bitget Agentic Account paper-order routing (human-confirmed), Bitget MCP fundamentals/news evidence, wallet connect.
