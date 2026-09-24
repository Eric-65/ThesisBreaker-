"use client";

import { useEffect, useState } from "react";
import type { MarketQuote } from "@/lib/market/types";

/** Symbols to display on the landing ticker. Prices come from the live
 * router — nothing here is hardcoded except the routing hints. */
const SYMBOLS: { symbol: string; assetType: "STOCK" | "CRYPTO" }[] = [
  { symbol: "SPY", assetType: "STOCK" },
  { symbol: "QQQ", assetType: "STOCK" },
  { symbol: "NVDA", assetType: "STOCK" },
  { symbol: "AAPL", assetType: "STOCK" },
  { symbol: "MSFT", assetType: "STOCK" },
  { symbol: "AMZN", assetType: "STOCK" },
  { symbol: "META", assetType: "STOCK" },
  { symbol: "GOOGL", assetType: "STOCK" },
  { symbol: "TSLA", assetType: "STOCK" },
  { symbol: "AMD", assetType: "STOCK" },
  { symbol: "BTC/USDT", assetType: "CRYPTO" },
  { symbol: "ETH/USDT", assetType: "CRYPTO" },
  { symbol: "SOL/USDT", assetType: "CRYPTO" },
];

export function TickerMarquee() {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.all(
        SYMBOLS.map(async ({ symbol, assetType }) => {
          try {
            const url = new URL("/api/market/quote", window.location.origin);
            url.searchParams.set("symbol", symbol);
            url.searchParams.set("assetType", assetType);
            const res = await fetch(url.toString());
            const json = await res.json();
            if (json.ok && json.data?.quote) {
              return { symbol, quote: json.data.quote as MarketQuote };
            }
          } catch {
            // ignore
          }
          return null;
        }),
      );
      if (cancelled) return;
      const next: Record<string, MarketQuote> = {};
      for (const r of results) if (r) next[r.symbol] = r.quote;
      setQuotes(next);
    }
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Build the render list: for symbols without data yet, show a subtle
  // "…" placeholder — never a fake price.
  const items = SYMBOLS.map(({ symbol }) => ({
    symbol,
    quote: quotes[symbol],
  }));
  const list = [...items, ...items];

  return (
    <div className="relative border-y border-[#12141b] bg-[#07080c]/70">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#06070a] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#06070a] to-transparent" />
      <div className="overflow-hidden">
        <div className="marquee-track flex w-max gap-8 py-2.5">
          {list.map((t, i) => {
            const q = t.quote;
            if (!q || q.price == null) {
              return (
                <div key={i} className="flex items-center gap-2 whitespace-nowrap text-xs">
                  <span className="font-semibold tracking-wide text-white">{t.symbol}</span>
                  <span className="tabular text-[#5e6472]">…</span>
                </div>
              );
            }
            const up = (q.changePercent24h ?? 0) >= 0;
            const price =
              q.price >= 1000
                ? q.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                : q.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
            const pctStr = q.changePercent24h != null
              ? `${up ? "+" : ""}${q.changePercent24h.toFixed(2)}%`
              : "";
            return (
              <div key={i} className="flex items-center gap-2 whitespace-nowrap text-xs">
                <span className="font-semibold tracking-wide text-white">{t.symbol}</span>
                <span className="tabular text-[#9aa1ae]">{price}</span>
                {pctStr && (
                  <span className={`tabular ${up ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {pctStr}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
