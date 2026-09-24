"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataSourceBadge, relativeAge } from "./DataSourceBadge";
import type { AssetIdentity, NftFloorSeries, NftStats } from "@/lib/market/types";

export function NftPanel({ identity }: { identity: AssetIdentity }) {
  const [stats, setStats] = useState<NftStats | null>(null);
  const [history, setHistory] = useState<NftFloorSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const slug = identity.openSeaSlug ?? identity.symbol.toLowerCase();
        const url = new URL("/api/market/nft", window.location.origin);
        url.searchParams.set("slug", slug);
        const res = await fetch(url.toString());
        const json = await res.json();
        if (cancelled) return;
        if (json.ok) {
          setStats(json.data.stats);
          setHistory(json.data.history);
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
  }, [identity.openSeaSlug, identity.symbol]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[#9aa1ae]">
        <Loader2 size={14} className="animate-spin" /> Loading OpenSea data…
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-dashed border-[#2a2f3c] p-4 text-sm">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#fca5a5]">
          <AlertTriangle size={14} /> NFT DATA TEMPORARILY UNAVAILABLE
        </div>
        <div className="text-xs text-[#7a8091]">
          OpenSea did not return usable data for &ldquo;{identity.symbol}&rdquo;. This is not a
          placeholder — no fabricated floor price is displayed.
        </div>
      </div>
    );
  }

  const currency = stats.floorCurrency || "ETH";

  return (
    <div>
      <div className="flex items-start gap-4">
        {stats.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stats.imageUrl}
            alt={stats.name}
            className="h-16 w-16 rounded-lg border border-[#1e222c] object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">
            {stats.chain.toUpperCase()} · OpenSea
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="font-display text-2xl text-white tabular">
              {stats.floorPrice != null ? stats.floorPrice.toFixed(3) : "—"} {currency}
            </div>
            <div className="text-[11px] text-[#5e6472]">Floor</div>
          </div>
          <div className="mt-1">
            <DataSourceBadge
              status={stats.status}
              source={stats.source}
              timestamp={stats.timestamp}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Cell label="24h Volume" value={fmt(stats.volume24h, currency)} />
        <Cell label="24h Sales" value={stats.sales24h != null ? String(stats.sales24h) : "—"} />
        <Cell label="Owners" value={stats.owners != null ? stats.owners.toLocaleString() : "—"} />
        <Cell
          label="Total Volume"
          value={fmt(stats.totalVolume, currency)}
        />
      </div>

      <div className="mt-4">
        {history && history.points.length > 1 ? (
          <FloorChart series={history} />
        ) : (
          <div className="rounded-md border border-dashed border-[#2a2f3c] p-3 text-[11px] text-[#7a8091]">
            Floor-price history unavailable from OpenSea for this collection. Chart hidden rather
            than fabricated.
          </div>
        )}
      </div>

      <div className="mt-3 text-[10px] text-[#5e6472]">
        Updated {relativeAge(stats.timestamp)} · Source: OpenSea
      </div>
    </div>
  );
}

function FloorChart({ series }: { series: NftFloorSeries }) {
  const data = series.points.map((p) => ({
    t: p.t,
    label: new Date(p.t).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    floor: p.floor,
  }));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-[#5e6472]">
        <span>30D FLOOR · SOURCE: OPENSEA</span>
        <span>{series.points.length} points</span>
      </div>
      <div style={{ height: 160 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="floor-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#9aa1ae" stopOpacity={0.3} />
                <stop offset="1" stopColor="#9aa1ae" stopOpacity={0} />
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
            <YAxis stroke="#3b4252" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#0b0d12", border: "1px solid #1e222c", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#9aa1ae" }}
              formatter={(v) => [`${Number(v).toFixed(3)} ETH`, "Floor"]}
            />
            <Area type="monotone" dataKey="floor" stroke="#9aa1ae" fill="url(#floor-fill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#1e222c] bg-[#0a0c11] p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">{label}</div>
      <div className="mt-0.5 tabular text-sm text-white">{value}</div>
    </div>
  );
}

function fmt(v: number | null, currency: string): string {
  if (v == null) return "—";
  return `${v.toLocaleString(undefined, {
    minimumFractionDigits: Math.abs(v) < 1 ? 3 : 2,
    maximumFractionDigits: Math.abs(v) < 1 ? 3 : 2,
  })} ${currency}`;
}
