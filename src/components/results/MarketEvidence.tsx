import { Activity } from "lucide-react";
import type { MarketSnapshot } from "@/lib/analysis/types";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values
    .map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(2)},${(28 - ((v - min) / (max - min || 1)) * 26).toFixed(2)}`)
    .join(" ");
  const up = values.at(-1)! >= values[0];
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-12 w-full" role="img" aria-label={`Price trend over the window, ${up ? "up" : "down"}`}>
      <polyline points={pts} fill="none" stroke={up ? "#00E0F0" : "#FF4D4F"} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });

/** Liquid pairs have spreads far below 0.01%, so show basis points instead of "0%". */
const fmtSpread = (pct: number) =>
  pct * 100 < 0.01 ? "< 0.01 bps" : pct < 0.01 ? `${fmt(pct * 100, 2)} bps` : `${fmt(pct, 3)}%`;

export function MarketEvidence({ market }: { market: MarketSnapshot | null }) {
  return (
    <section className="glass p-5" aria-labelledby="market-heading">
      <h3 id="market-heading" className="flex items-center gap-2 text-sm font-semibold">
        <Activity className="h-4 w-4 text-cyan" aria-hidden /> Price evidence
      </h3>
      {!market ? (
        <p className="mt-3 text-sm text-muted">No ticker recognized in the idea, so no live prices were used.</p>
      ) : market.error || !market.ticker ? (
        <p className="mt-3 text-sm text-muted">
          Live data for <span className="num text-ink">{market.underlying}</span> unavailable: {market.error ?? "no ticker"}.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="num text-sm text-muted">{market.exchangeSymbol}</span>
            <span className={`num text-sm ${market.ticker.change24hPct >= 0 ? "text-pass" : "text-block"}`}>
              {market.ticker.change24hPct >= 0 ? "+" : ""}
              {fmt(market.ticker.change24hPct)}% 24h
            </span>
          </div>
          <p className="num mt-1 text-2xl text-ink">{fmt(market.ticker.last, 4)}</p>
          {market.candles && (
            <div className="mt-2">
              <p className="num flex justify-between text-[11px] text-muted">
                <span>{market.candles.count}h trend · 1h candles</span>
                <span className={market.candles.windowChangePct >= 0 ? "text-pass" : "text-block"}>
                  {market.candles.windowChangePct >= 0 ? "+" : ""}
                  {fmt(market.candles.windowChangePct)}%
                </span>
              </p>
              <Sparkline values={market.candles.closes} />
            </div>
          )}
          <dl className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted">24h range</dt>
            <dd className="text-right">{fmt(market.ticker.low24h, 4)} – {fmt(market.ticker.high24h, 4)}</dd>
            <dt className="text-muted">24h volume</dt>
            <dd className="text-right">{fmt(market.ticker.quoteVolume24h, 0)} USDT</dd>
            {market.ticker.spreadPct !== null && (
              <>
                <dt className="text-muted">Spread</dt>
                <dd className="text-right">{fmtSpread(market.ticker.spreadPct)}</dd>
              </>
            )}
            {market.candles && (
              <>
                <dt className="text-muted">{market.candles.count}h range</dt>
                <dd className="text-right">
                  {fmt(market.candles.windowLow, 4)} – {fmt(market.candles.windowHigh, 4)}
                </dd>
              </>
            )}
            {market.daily && (
              <>
                <dt className="text-muted">{market.daily.days >= 360 ? "1y" : `${market.daily.days}d`} high</dt>
                <dd className="text-right">
                  {fmt(market.daily.high, 4)}{" "}
                  <span className="text-muted">({fmt(market.daily.fromHighPct)}%)</span>
                </dd>
                <dt className="text-muted">{market.daily.days >= 360 ? "1y" : `${market.daily.days}d`} low</dt>
                <dd className="text-right">{fmt(market.daily.low, 4)}</dd>
              </>
            )}
          </dl>
          <p className="mt-3 text-[11px] text-muted">
            Bitget spot · public API v2 · {new Date(market.fetchedAt).toUTCString().replace(" GMT", " UTC")}
          </p>
        </>
      )}
    </section>
  );
}
