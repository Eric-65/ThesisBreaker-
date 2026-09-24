"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  History,
  Loader2,
  Sparkles,
  Swords,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CountUp } from "../CountUp";
import { pushToast } from "../toasts";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  symbol: string;
  direction: string;
  status: string;
  initialScore: number;
  currentScore: number;
  createdAt: string;
  verdict: string;
}

interface EventItem {
  id: string;
  kind: string;
  message: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  thesisId: string;
  symbol: string;
  createdAt: string;
}

interface AlpacaAcct {
  equity: string;
  buying_power: string;
}
interface AlpacaPos {
  symbol: string;
}

export function DashboardClient({
  theses,
  events,
}: {
  theses: Item[];
  events: EventItem[];
}) {
  const router = useRouter();
  const [account, setAccount] = useState<AlpacaAcct | null>(null);
  const [positions, setPositions] = useState<AlpacaPos[]>([]);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([
        fetch("/api/alpaca/account").then((r) => r.json()),
        fetch("/api/alpaca/positions").then((r) => r.json()),
      ]);
      setAccount(a.data);
      setPositions(p.data ?? []);
    })();
  }, []);

  const validated = theses.filter((t) => t.verdict === "VALIDATED_FOR_PAPER_TEST").length;
  const paperTraded = theses.filter((t) => t.status === "PAPER_TRADED").length;
  const activeTheses = theses.filter(
    (t) => t.status !== "INVALIDATED" && t.status !== "REJECTED",
  );

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/theses/demo", { method: "POST" });
      const json = await res.json();
      if (json.ok && json.data?.id) {
        pushToast({ kind: "agent", title: "Demo thesis created", body: "Opening workspace…" });
        router.push(`/thesis/${json.data.id}`);
      }
    } finally {
      setSeeding(false);
    }
  };

  const equity = Number(account?.equity ?? 0);
  const bp = Number(account?.buying_power ?? 0);
  const openPos = positions.length;

  const strengthSeries = buildStrengthSeries(theses);

  return (
    <div>
      {/* Live metric cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Paper Equity"
          value={equity > 0 ? `$${equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          icon={Gauge}
          accent="#e7e9ee"
        />
        <StatCard
          label="Buying Power"
          value={bp > 0 ? `$${bp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          icon={Activity}
          accent="#22c55e"
        />
        <StatCardNumber label="Open Positions" value={openPos} icon={CheckCircle2} accent="#f5b400" />
        <StatCardNumber label="Active Theses" value={activeTheses.length} icon={Swords} accent="#ef4444" />
      </div>

      {/* Chart + activity */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <motion.div
          className="surface p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                Thesis Strength Overview
              </div>
              <div className="mt-0.5 font-display text-xl text-white">
                Portfolio conviction
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest">
              <LegendDot color="#22c55e" label="Strengthened" />
              <LegendDot color="#ef4444" label="Weakened" />
              <LegendDot color="#f5b400" label="Stable" />
            </div>
          </div>
          {strengthSeries.length === 0 ? (
            <EmptyStrength onSeed={seedDemo} seeding={seeding} />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <AreaChart
                  data={strengthSeries}
                  margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="ds-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="1" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    stroke="#3b4252"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#3b4252"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[30, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0b0d12",
                      border: "1px solid #1e222c",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#9aa1ae" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#ds-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div
          className="surface p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
            <Sparkles size={12} className="text-[#ef4444]" /> Recent Agent Activity
          </div>
          <ul className="space-y-2">
            {events.length === 0 && (
              <li className="rounded-md border border-dashed border-[#2a2f3c] p-3 text-center text-xs text-[#5e6472]">
                No agent activity yet. Create a thesis to start.
              </li>
            )}
            {events.map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.03 }}
              >
                <Link
                  href={`/thesis/${e.thesisId}`}
                  className="flex items-start gap-3 rounded-lg border border-[#1e222c] bg-[#0a0c11] p-3 hover:border-[#2a2f3c] hover:bg-white/[0.02]"
                >
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: eventColor(e.kind),
                      boxShadow: `0 0 8px ${eventColor(e.kind)}`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#5e6472]">
                      <span style={{ color: eventColor(e.kind) }}>
                        {e.kind.replace(/_/g, " ")}
                      </span>
                      {e.symbol && (
                        <span className="font-mono text-white">· {e.symbol}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-[#cbd0da] line-clamp-2">{e.message}</div>
                    <div className="mt-1 text-[10px] text-[#5e6472]">
                      {new Date(e.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Active Theses cards */}
      <motion.div
        className="mt-6 surface overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between border-b border-[#1e222c] p-4">
          <div className="flex items-center gap-2">
            <History size={14} className="text-[#5e6472]" />
            <div className="text-sm font-semibold text-white">Active Theses</div>
            <span className="text-xs text-[#5e6472]">({activeTheses.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip">
              Validated {validated} · Paper {paperTraded}
            </span>
            <Link href="/history" className="text-xs text-[#9aa1ae] hover:text-white">
              History <ArrowUpRight size={11} className="inline" />
            </Link>
          </div>
        </div>
        {theses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-14 text-center">
            <div className="max-w-sm text-sm text-[#9aa1ae]">
              Your first thesis starts here. Try the flagship demo or write your own idea and
              let the agent break it.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn btn-primary" onClick={seedDemo} disabled={seeding}>
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Try Demo (NVDA)
              </button>
              <Link href="/new" className="btn btn-secondary">
                <Swords size={14} /> Break My Thesis
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {activeTheses.map((t) => {
              const delta = t.currentScore - t.initialScore;
              return (
                <Link
                  key={t.id}
                  href={`/thesis/${t.id}`}
                  className="surface surface-hover block p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#1e222c] bg-[#0b0d12] font-mono text-xs font-bold">
                        {t.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-mono text-sm font-semibold text-white">
                          {t.symbol}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">
                          {t.direction} · {shortStatus(t)}
                        </div>
                      </div>
                    </div>
                    <StatusChip status={t.status} verdict={t.verdict} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="tabular text-xs text-[#5e6472]">
                      Score{" "}
                      <span className="text-white">{t.initialScore}</span> →{" "}
                      <span
                        style={{
                          color:
                            delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "#f5b400",
                        }}
                      >
                        {t.currentScore}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{
                        color:
                          delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "#5e6472",
                      }}
                    >
                      {delta > 0 ? (
                        <TrendingUp size={12} />
                      ) : delta < 0 ? (
                        <TrendingDown size={12} />
                      ) : null}
                      {delta > 0
                        ? `Strengthening +${delta}`
                        : delta < 0
                          ? `Weakening ${delta}`
                          : "Stable"}
                    </div>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#12141b]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${t.currentScore}%`,
                        background:
                          delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "#f5b400",
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}) {
  return (
    <div className="surface surface-hover p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
          {label}
        </div>
        <Icon size={14} className="text-[#5e6472]" />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
function StatCardNumber({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}) {
  return (
    <div className="surface surface-hover p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
          {label}
        </div>
        <Icon size={14} className="text-[#5e6472]" />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular" style={{ color: accent }}>
        <CountUp to={value} duration={1.2} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[#7a8091]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function StatusChip({ status, verdict }: { status: string; verdict: string }) {
  if (status === "PAPER_TRADED") return <span className="chip chip-bull">PAPER</span>;
  if (verdict === "VALIDATED_FOR_PAPER_TEST") return <span className="chip chip-bull">VALIDATED</span>;
  if (verdict === "REJECTED") return <span className="chip chip-bear">REJECTED</span>;
  if (verdict === "THESIS_TOO_FRAGILE") return <span className="chip chip-bear">FRAGILE</span>;
  return <span className="chip chip-warn">NEEDS EVIDENCE</span>;
}

function shortStatus(t: Item): string {
  const d = t.currentScore - t.initialScore;
  if (t.status === "PAPER_TRADED") return "monitoring";
  if (d > 0) return "strengthening";
  if (d < 0) return "weakening";
  return "stable";
}

function eventColor(kind: string): string {
  if (kind.includes("STRENGTHEN") || kind === "PAPER_ORDER_FILLED" || kind === "PAPER_ORDER_SUBMITTED")
    return "#22c55e";
  if (
    kind.includes("WEAKENED") ||
    kind === "CONTRADICTION_DETECTED" ||
    kind === "INVALIDATION_TRIGGERED"
  )
    return "#ef4444";
  if (kind === "THESIS_RE_CHALLENGED") return "#f5b400";
  return "#9aa1ae";
}

function EmptyStrength({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#2a2f3c] text-center">
      <div className="text-sm text-[#9aa1ae]">
        Thesis strength appears once you create a thesis.
      </div>
      <button className="btn btn-primary" onClick={onSeed} disabled={seeding}>
        {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Try Demo (NVDA)
      </button>
    </div>
  );
}

function buildStrengthSeries(theses: Item[]) {
  if (theses.length === 0) return [];
  // Sort chronologically. Each point is average of all current scores at that time.
  const sorted = [...theses].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const series: { label: string; avg: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const slice = sorted.slice(0, i + 1);
    const avg = Math.round(
      slice.reduce((s, t) => s + t.currentScore, 0) / slice.length,
    );
    series.push({
      label: new Date(sorted[i].createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      avg,
    });
  }
  return series;
}
