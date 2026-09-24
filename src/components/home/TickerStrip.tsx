"use client";

import { useEffect, useState } from "react";

interface Quote {
  underlying: string;
  exchangeSymbol: string;
  last: number;
  change24hPct: number;
}

function fmtPrice(n: number) {
  return n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 5 : 2 });
}

/** Live Bitget prices as an infinite marquee. Only verified symbols are shown. */
export function TickerStrip() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market/tickers")
        .then((r) => (r.ok ? r.json() : { quotes: [] }))
        .then((d: { quotes: Quote[] }) => alive && setQuotes(d.quotes))
        .catch(() => alive && setQuotes([]));
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section aria-label="Live prices from Bitget" className="border-y border-line bg-surface/60">
      {quotes === null ? (
        <div className="h-11 animate-pulse bg-white/[0.02]" />
      ) : quotes.length === 0 ? (
        <p className="num flex h-11 items-center justify-center px-4 text-center text-xs text-muted">
          Live Bitget prices unavailable right now — analysis still runs.
        </p>
      ) : (
        <div className="group relative flex h-11 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <ul className="flex w-max shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused]">
            {[...quotes, ...quotes].map((q, i) => (
              <li key={i} aria-hidden={i >= quotes.length} className="num flex items-center gap-2 px-5 text-xs">
                <span className="text-ink">{q.underlying}</span>
                <span className="text-muted">{fmtPrice(q.last)}</span>
                <span className={q.change24hPct >= 0 ? "text-pass" : "text-block"}>
                  {q.change24hPct >= 0 ? "▲" : "▼"} {Math.abs(q.change24hPct).toFixed(2)}%
                </span>
                <span className="text-[10px] text-muted/70">{q.exchangeSymbol}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
