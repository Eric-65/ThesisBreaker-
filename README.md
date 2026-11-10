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
| `AUTH_SECRET` | Auth.js signing/encryption secret (`npx auth secret`). Required for sign-in. |
| `AUTH_URL` | Optional. Canonical site URL; only needed outside Vercel or behind a proxy. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client. Redirect URI: `https://<domain>/api/auth/callback/google`. |
| `AUTH_RESEND_KEY` / `AUTH_EMAIL_FROM` | Resend API key and verified sender for email magic links. |
| `IP_HASH_SALT` | Optional salt for hashed-IP rate-limit keys (falls back to `AUTH_SECRET`). |

Sign-in is optional and turns on only when `AUTH_SECRET`, `DATABASE_URL` and at least one provider (Google or Resend) are configured; otherwise the app runs anonymously.

No variable uses the `NEXT_PUBLIC_` prefix; nothing is exposed to the browser.

## How it works

- `POST /api/analyze` streams Server-Sent Events: step progress, market evidence, model deltas, and one final result.
- `src/lib/analysis/run.ts` — orchestration: parse → 24h cache lookup → Bitget price evidence → Qwen (streamed, zod-validated) → verdict guardrail → save.
- `src/lib/qwen.ts` — native `fetch` client: JSON mode and `enable_thinking` with automatic fallback if the endpoint rejects them, timeout, one retry on 5xx, SSE streaming, typed `QwenError`.
- `src/lib/analysis/heuristic.ts` — deterministic offline fallback, clearly labeled in the UI.
- `src/lib/market/` — `MarketDataProvider` interface + Bitget public spot v2 implementation. Symbols are resolved against Bitget's live symbol list, never guessed. `FundamentalsProvider` is the Phase 2 extension point.
- Token usage for every Qwen call (and cache hits) is logged in `qwen_calls`.

## Visitors, accounts & stats

- **Anonymous visitors.** `src/proxy.ts` gives each browser an httpOnly, `SameSite=Lax` (and `Secure` in production) `tb_vid` cookie holding a random UUID (1-year expiry). A visit starts when the sliding 30-minute `tb_seen` cookie is missing; the proxy then upserts the `users` row (`last_seen_at`, and `visit_count` at most once per 30 min — enforced in SQL). Bots, crawlers, link unfurlers and scripted clients are skipped by user-agent.
- **Ownership.** Every saved analysis (`theses.user_id`) and Qwen call (`qwen_calls.user_id`) belongs to a user row. `/history` lists only the current visitor's or signed-in account's analyses. Individual verdict pages (`/history/<uuid>`) stay viewable by link.
- **Optional sign-in** (`src/auth.ts`, Auth.js v5 + Drizzle adapter, database sessions): Google OAuth and Resend magic links. A first sign-in *claims* the current anonymous row (same `users.id`, email attached). Signing into an existing account from another browser moves that browser's anonymous analyses onto the account and removes the empty anonymous row. Signing out gives the browser a fresh anonymous id.
- **Rate limits** on `POST /api/analyze`: 6/min per visitor and 20/min per salted IP hash (in memory), plus 30/hour per visitor counted in Postgres so it holds across serverless instances. Raw IPs are never stored or logged.
- **Public stats.** `GET /api/stats` → `{ users, analyses, returningUsers }` from live `COUNT` queries, cached 60 s (data cache + `s-maxage=60`). The landing page shows it next to the main CTA and hides it when the DB is unavailable — numbers are never seeded or faked.

## Scripts

`npm run dev | build | start | lint | typecheck | db:generate | db:migrate | images`

`npm run images` regenerates the procedural brand images in `public/images/` (see `CREDITS.md`).

## Phase 2 (not in this build)

Bitget Agentic Account paper-order routing (human-confirmed), Bitget MCP fundamentals/news evidence, wallet connect.
