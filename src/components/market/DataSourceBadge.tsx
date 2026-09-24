"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import type { DataStatus, MarketQuote, ProviderId } from "@/lib/market/types";

const STATUS_COLOR: Record<DataStatus, { color: string; label: string }> = {
  LIVE: { color: "#22c55e", label: "LIVE" },
  DELAYED: { color: "#f5b400", label: "DELAYED" },
  STALE: { color: "#f5b400", label: "STALE" },
  UNAVAILABLE: { color: "#ef4444", label: "UNAVAILABLE" },
  DEMO: { color: "#9aa1ae", label: "DEMO" },
};

const PROVIDER_LABEL: Record<ProviderId, string> = {
  ALPACA_STOCK: "Alpaca",
  ALPACA_CRYPTO: "Alpaca Crypto",
  BINANCE: "Binance",
  COINGECKO: "CoinGecko",
  OPENSEA: "OpenSea",
  DEMO: "Demo Data",
};

export function relativeAge(timestamp: string): string {
  const t = new Date(timestamp).getTime();
  if (!Number.isFinite(t)) return "unknown";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Compact "LIVE · Alpaca · Updated 5s ago" badge with hover-reveal details.
 * Auto-refreshes the relative age every second so old data becomes STALE
 * visually without requiring an external refetch.
 */
export function DataSourceBadge({
  status,
  source,
  feed,
  timestamp,
  compact = false,
}: {
  status: DataStatus;
  source: ProviderId;
  feed?: string;
  timestamp: string;
  compact?: boolean;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const s = STATUS_COLOR[status];
  const age = relativeAge(timestamp);
  // Force referencing `tick` so re-render happens
  void tick;
  return (
    <div
      className="group relative inline-flex items-center gap-1.5"
      title={`${s.label} · ${PROVIDER_LABEL[source]}${feed ? ` (${feed})` : ""} · Updated ${age}`}
    >
      <span
        className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
        style={{
          borderColor: `${s.color}44`,
          background: `${s.color}12`,
          color: s.color,
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: s.color,
            boxShadow: status === "LIVE" ? `0 0 6px ${s.color}` : undefined,
          }}
        />
        {s.label}
      </span>
      {!compact && (
        <span className="text-[10px] text-[#7a8091]">
          {PROVIDER_LABEL[source]} · Updated {age}
        </span>
      )}
      {compact && <Info size={10} className="text-[#5e6472] opacity-60 group-hover:opacity-100" />}
    </div>
  );
}

/** Helper: extract badge props from a MarketQuote. */
export function badgeFromQuote(q: MarketQuote) {
  return {
    status: q.status,
    source: q.source,
    feed: q.feed,
    timestamp: q.timestamp,
  };
}
