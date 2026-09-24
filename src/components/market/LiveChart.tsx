"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { HistoricalSeries, ProviderId } from "@/lib/market/types";

const PROVIDER_LABEL: Record<ProviderId, string> = {
  ALPACA_STOCK: "ALPACA",
  ALPACA_CRYPTO: "ALPACA",
  BINANCE: "BINANCE",
  COINGECKO: "COINGECKO",
  OPENSEA: "OPENSEA",
  DEMO: "DEMO",
};

export function LiveChart({
  symbol,
  assetType,
  window: win = "30D",
  height = 200,
  color,
}: {
  symbol: string;
  assetType?: "STOCK" | "ETF" | "CRYPTO";
  window?: "30D" | "7D" | "1D";
  height?: number;
  color?: string;
}) {
  const [series, setSeries] = useState<HistoricalSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const url = new URL("/api/market/bars", window.location.origin);
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("window", win);
        if (assetType) url.searchParams.set("assetType", assetType);
        const res = await fetch(url.toString());
        const json = await res.json();
        if (cancelled) return;
        if (json.ok && json.data) {
          setSeries(json.data as HistoricalSeries);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, assetType, win]);

  const trendUp = series && series.bars.length >= 2
    ? series.bars[series.bars.length - 1].c >= series.bars[0].c
    : true;
  const strokeColor = color ?? (trendUp ? "#22c55e" : "#ef4444");

  if (loading) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-md border border-dashed border-[#2a2f3c] text-xs text-[#5e6472]"
        style={{ height }}
      >
        <Loader2 size={12} className="mr-1 animate-spin" /> Loading historical data…
      </div>
    );
  }

  if (error || !series || series.bars.length === 0) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center rounded-md border border-dashed border-[#2a2f3c] text-xs text-[#5e6472]"
        style={{ height }}
      >
        <AlertTriangle size={12} className="mb-1 text-[#f5b400]" />
        Historical data unavailable
      </div>
    );
  }

  const data = series.bars.map((b) => ({
    t: b.t,
    label: labelFor(b.t, win),
    c: b.c,
  }));
  const providerLabel = PROVIDER_LABEL[series.source];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-[#5e6472]">
        <span>
          {win} · SOURCE: {providerLabel}
        </span>
        <span>{series.bars.length} points</span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={`lc-${symbol}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="1" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              stroke="#3b4252"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis
              stroke="#3b4252"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) =>
                typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: "#0b0d12",
                border: "1px solid #1e222c",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#9aa1ae" }}
              formatter={(v) => [Number(v).toLocaleString(), "Close"]}
            />
            <Area
              type="monotone"
              dataKey="c"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#lc-${symbol})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function labelFor(iso: string, win: "30D" | "7D" | "1D"): string {
  const d = new Date(iso);
  if (win === "1D") {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
