"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCcw, Star, Trash2 } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LivePrice } from "../market/LivePrice";

interface Account {
  equity: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
}
interface Position {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
}
interface Order {
  id: string;
  symbol: string;
  qty: string;
  side: string;
  type: string;
  status: string;
  submitted_at: string;
  filled_avg_price?: string;
}
interface History {
  timestamp: number[];
  equity: number[];
  base_value: number;
}

interface ThesisLink {
  id: string;
  symbol: string;
  currentScore: number;
  initialScore: number;
  status: string;
  originalText: string;
}

interface WatchItem {
  id: string;
  symbol: string;
  assetType: "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION" | string;
  displayName: string;
}

export function PaperTradingClient() {
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<History | null>(null);
  const [theses, setTheses] = useState<ThesisLink[]>([]);
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [lastSynced, setLastSynced] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const [acc, pos, ord, hist, th, wl] = await Promise.all([
        fetch("/api/alpaca/account").then((r) => r.json()),
        fetch("/api/alpaca/positions").then((r) => r.json()),
        fetch("/api/alpaca/orders").then((r) => r.json()),
        fetch("/api/alpaca/portfolio-history").then((r) => r.json()),
        fetch("/api/theses").then((r) => r.json()),
        fetch("/api/watchlist").then((r) => r.json()).catch(() => null),
      ]);
      if (wl?.ok && Array.isArray(wl.data)) setWatch(wl.data as WatchItem[]);
      setMode(acc.mode ?? "demo");
      setAccount(acc.data);
      setPositions(pos.data ?? []);
      setOrders(ord.data ?? []);
      setHistory(hist.data ?? null);
      if (th.ok && Array.isArray(th.data)) {
        setTheses(
          th.data.map((t: {
            id: string;
            symbol: string;
            currentScore: number;
            initialScore: number;
            status: string;
            originalText: string;
          }) => ({
            id: t.id,
            symbol: t.symbol,
            currentScore: t.currentScore,
            initialScore: t.initialScore,
            status: t.status,
            originalText: t.originalText,
          })),
        );
      }
      setLastSynced(new Date().toLocaleTimeString());
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  // Group theses by symbol so a position can look up "why do I own this?"
  const thesisBySymbol = new Map<string, ThesisLink>();
  for (const t of theses) {
    const existing = thesisBySymbol.get(t.symbol);
    if (!existing) thesisBySymbol.set(t.symbol, t);
  }

  const equity = Number(account?.equity ?? 0);
  const buyingPower = Number(account?.buying_power ?? 0);
  const totalPL = history ? equity - history.base_value : 0;
  const dayPL = history && history.equity.length >= 2
    ? history.equity[history.equity.length - 1] - history.equity[history.equity.length - 2]
    : 0;

  const chartData = (history?.timestamp ?? []).map((ts, i) => ({
    date: new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    equity: history!.equity[i],
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <span className="chip chip-warn">Paper</span>
        <span className={`chip ${mode === "live" ? "chip-bull" : ""}`}>
          {mode === "live" ? "Live Alpaca Data" : "Demo Data"}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[#5e6472]">
          Last synced {lastSynced || "—"}
        </span>
        <button className="btn btn-secondary ml-auto text-xs" onClick={sync} disabled={syncing}>
          {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          Sync Now
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Equity" value={`$${equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <MetricCard label="Buying Power" value={`$${buyingPower.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <MetricCard
          label="Day P/L"
          value={`${dayPL >= 0 ? "+" : ""}$${dayPL.toFixed(2)}`}
          color={dayPL >= 0 ? "#22c55e" : "#ef4444"}
        />
        <MetricCard
          label="Total P/L"
          value={`${totalPL >= 0 ? "+" : ""}$${totalPL.toFixed(2)}`}
          color={totalPL >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      <motion.div
        className="mt-6 surface p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
            Portfolio Equity
          </div>
          <div className="text-xs text-[#5e6472]">30D</div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="eq-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="1" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#3b4252" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#3b4252"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 500", "dataMax + 500"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#0b0d12",
                  border: "1px solid #1e222c",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#9aa1ae" }}
                formatter={(v) => [`$${Number(v).toLocaleString()}`, "Equity"]}
              />
              <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="url(#eq-fill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface overflow-hidden">
          <div className="border-b border-[#1e222c] p-4 text-sm font-semibold text-white">
            Positions
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[#1e222c] text-[10px] uppercase tracking-widest text-[#5e6472]">
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Avg Entry</th>
                  <th className="p-3 text-right">Current</th>
                  <th className="p-3 text-right">P/L</th>
                  <th className="p-3 text-right">P/L %</th>
                  <th className="p-3 text-left">Thesis</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const pl = Number(p.unrealized_pl);
                  const plpc = Number(p.unrealized_plpc) * 100;
                  const t = thesisBySymbol.get(p.symbol);
                  return (
                    <tr key={p.symbol} className="border-b border-[#12141b] hover:bg-white/[0.02]">
                      <td className="p-3 font-mono font-semibold text-white">{p.symbol}</td>
                      <td className="p-3 text-right tabular">{p.qty}</td>
                      <td className="p-3 text-right tabular">${Number(p.avg_entry_price).toFixed(2)}</td>
                      <td className="p-3 text-right tabular">${Number(p.current_price).toFixed(2)}</td>
                      <td
                        className="p-3 text-right tabular"
                        style={{ color: pl >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                      </td>
                      <td
                        className="p-3 text-right tabular"
                        style={{ color: plpc >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {plpc >= 0 ? "+" : ""}
                        {plpc.toFixed(2)}%
                      </td>
                      <td className="p-3">
                        {t ? (
                          <Link
                            href={`/thesis/${t.id}`}
                            className="inline-flex items-center gap-2 text-xs text-[#9aa1ae] hover:text-white"
                          >
                            <span className="tabular">
                              {t.initialScore} →{" "}
                              <span
                                style={{
                                  color:
                                    t.currentScore >= t.initialScore ? "#22c55e" : "#ef4444",
                                }}
                              >
                                {t.currentScore}
                              </span>
                            </span>
                            <span className="text-[#5e6472]">Open →</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-[#5e6472]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {positions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-[#5e6472]">
                      No paper positions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-[#1e222c] p-4 text-sm font-semibold text-white">
            Recent Orders
          </div>
          <ul>
            {orders.slice(0, 8).map((o) => (
              <li key={o.id} className="flex items-center justify-between border-b border-[#12141b] p-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-white">{o.symbol}</span>
                    <span
                      className={o.side === "buy" ? "chip chip-bull" : "chip chip-bear"}
                    >
                      {o.side.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#5e6472]">{o.qty} · {o.type}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#5e6472]">
                    {new Date(o.submitted_at).toLocaleString()}
                  </div>
                </div>
                <OrderStatus status={o.status} />
              </li>
            ))}
            {orders.length === 0 && (
              <li className="p-6 text-center text-sm text-[#5e6472]">No orders yet.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Watchlist */}
      <div className="mt-6 surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e222c] p-4">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-[#f5b400]" />
            <div className="text-sm font-semibold text-white">Watchlist</div>
            <span className="text-xs text-[#5e6472]">({watch.length})</span>
          </div>
          <Link href="/market" className="text-xs text-[#9aa1ae] hover:text-white">
            Add from Market →
          </Link>
        </div>
        {watch.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-[#5e6472]">
            No watchlist yet.{" "}
            <Link href="/market" className="text-[#9aa1ae] hover:text-white">
              Add symbols from the Market page →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#12141b]">
            {watch.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#1e222c] bg-[#0b0d12] font-mono text-[11px] font-bold">
                  {w.symbol.split("/")[0].slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      {w.symbol}
                    </span>
                    <span className="text-xs text-[#5e6472]">· {w.displayName}</span>
                    <span className="chip">{String(w.assetType).replace("_", " ")}</span>
                  </div>
                </div>
                {w.assetType !== "NFT_COLLECTION" && (
                  <div className="hidden min-w-[180px] items-center justify-end md:flex">
                    <LivePrice
                      symbol={w.symbol}
                      assetType={w.assetType === "CRYPTO" ? "CRYPTO" : "STOCK"}
                      compact
                      refreshMs={25000}
                    />
                  </div>
                )}
                <Link
                  href={`/new?symbol=${encodeURIComponent(w.symbol)}&assetType=${w.assetType}`}
                  className="btn btn-secondary text-xs"
                >
                  Thesis
                </Link>
                <button
                  className="rounded-md p-2 text-[#7a8091] hover:bg-white/5 hover:text-[#fca5a5]"
                  onClick={async () => {
                    await fetch(
                      `/api/watchlist?symbol=${encodeURIComponent(w.symbol)}`,
                      { method: "DELETE" },
                    );
                    setWatch((xs) => xs.filter((x) => x.symbol !== w.symbol));
                  }}
                  aria-label="Remove from watchlist"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="surface p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
        {label}
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold tabular" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function OrderStatus({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    filled: "chip chip-bull",
    pending: "chip chip-warn",
    new: "chip chip-warn",
    accepted: "chip chip-warn",
    canceled: "chip",
    cancelled: "chip",
    rejected: "chip chip-bear",
  };
  const cls = map[s] ?? "chip";
  return <span className={cls}>{status.toUpperCase()}</span>;
}
