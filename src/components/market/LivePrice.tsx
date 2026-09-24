"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketQuote } from "@/lib/market/types";
import { DataSourceBadge, relativeAge } from "./DataSourceBadge";

/**
 * Client component that fetches a live quote via /api/market/quote and
 * refreshes on an interval. Renders price · change · badge OR clearly
 * shows "DATA UNAVAILABLE" — never fabricates a number.
 */
export function LivePrice({
  symbol,
  assetType,
  refreshMs = 15000,
  compact = false,
  onQuote,
}: {
  symbol: string;
  assetType?: "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";
  refreshMs?: number;
  compact?: boolean;
  onQuote?: (q: MarketQuote) => void;
}) {
  const [q, setQ] = useState<MarketQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const url = new URL("/api/market/quote", window.location.origin);
        url.searchParams.set("symbol", symbol);
        if (assetType) url.searchParams.set("assetType", assetType);
        const res = await fetch(url.toString());
        const json = await res.json();
        if (stopped || !mounted.current) return;
        if (json.ok && json.data?.quote) {
          setQ(json.data.quote as MarketQuote);
          setErr(false);
          onQuote?.(json.data.quote as MarketQuote);
        } else {
          setErr(true);
        }
      } catch {
        if (!stopped && mounted.current) setErr(true);
      } finally {
        if (!stopped && mounted.current) setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, refreshMs);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [symbol, assetType, refreshMs, onQuote]);

  if (loading && !q) {
    return (
      <div className={compact ? "text-xs text-[#5e6472]" : "text-sm text-[#5e6472]"}>
        Loading…
      </div>
    );
  }

  if (!q || q.status === "UNAVAILABLE" || q.price == null) {
    return (
      <div className={compact ? "text-xs" : "text-sm"}>
        <div className="font-semibold text-[#fca5a5]">DATA UNAVAILABLE</div>
        {!compact && (
          <div className="mt-0.5 text-[10px] text-[#5e6472]">
            {err ? "Provider request failed." : "No recent data returned."}
          </div>
        )}
      </div>
    );
  }

  const pct = q.changePercent24h;
  const up = (pct ?? 0) >= 0;
  return (
    <div className={compact ? "text-xs" : "text-sm"}>
      <div className="flex items-baseline gap-2">
        <span
          className={
            compact ? "tabular text-white" : "font-display text-2xl tabular text-white"
          }
        >
          {q.currency === "USD" || q.currency === "USDT" || q.currency === "USDC"
            ? "$"
            : ""}
          {formatPrice(q.price)}
          {q.currency !== "USD" && q.currency !== "USDT" && q.currency !== "USDC"
            ? ` ${q.currency}`
            : ""}
        </span>
        {pct != null && (
          <span
            className={compact ? "tabular text-xs" : "tabular text-sm"}
            style={{ color: up ? "#22c55e" : "#ef4444" }}
          >
            {up ? "+" : ""}
            {q.change24h != null ? formatPrice(q.change24h) : ""}
            {" ("}
            {up ? "+" : ""}
            {pct.toFixed(2)}%)
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <DataSourceBadge
          status={q.status}
          source={q.source}
          feed={q.feed}
          timestamp={q.timestamp}
          compact={compact}
        />
        {compact && (
          <span className="text-[10px] text-[#5e6472]">{relativeAge(q.timestamp)}</span>
        )}
      </div>
    </div>
  );
}

function formatPrice(p: number): string {
  if (Math.abs(p) >= 10_000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(p) >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toFixed(4);
}
