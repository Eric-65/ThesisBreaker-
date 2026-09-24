"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  HelpCircle,
  Loader2,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  XCircle,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ScoreRing } from "../ScoreRing";
import { WorkflowStepper, type WorkflowStage } from "./WorkflowStepper";
import { PaperTradePreview } from "../trading/PaperTradePreview";
import { AgentActivity, type AgentTask } from "./AgentActivity";
import { ExpandableAssumptionCard } from "./AssumptionCard";
import { ContradictionCard } from "./ContradictionCard";
import { InvalidationCard } from "./InvalidationCard";
import { ScoreExplainer } from "./ScoreExplainer";
import { setAgentStatus } from "../AgentStatus";
import { pushToast } from "../toasts";
import type {
  AnalysisResult,
  Confidence,
  EvidenceItem,
  Impact,
  Verdict,
} from "@/lib/types";

interface OrderRow {
  id: string;
  alpacaOrderId: string | null;
  clientOrderId: string;
  symbol: string;
  side: string;
  qty: string;
  status: string;
  mode: string;
  estimatedPrice: string | null;
  estimatedNotional: string | null;
  createdAt: string;
}

interface EventRow {
  id: string;
  kind: string;
  message: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

interface Props {
  thesis: {
    id: string;
    symbol: string;
    assetType: "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";
    direction: "long" | "short";
    timeHorizon: string;
    positionSize: string;
    originalText: string;
    status: string;
    initialScore: number;
    currentScore: number;
    createdAt: string;
    analysis: AnalysisResult;
    originalAnalysis: AnalysisResult;
  };
  orders: OrderRow[];
  events: EventRow[];
}

export function ThesisWorkspace({ thesis, orders: initialOrders, events: initialEvents }: Props) {
  const router = useRouter();
  const [openTrade, setOpenTrade] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [monitoring, setMonitoring] = useState(false);
  const [current, setCurrent] = useState(thesis);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  const analysis = current.analysis;
  const orig = current.originalAnalysis;
  const verdict = analysis.verdict;

  // Persistent agent status while user is on the workspace
  useEffect(() => {
    setAgentStatus(current.status === "PAPER_TRADED" ? "MONITORING" : "READY");
    return () => setAgentStatus("IDLE");
  }, [current.status]);

  const stage: WorkflowStage =
    current.status === "PAPER_TRADED"
      ? "monitor"
      : verdict.status === "VALIDATED_FOR_PAPER_TEST"
        ? "paper"
        : "verdict";

  const verdictColor =
    verdict.status === "VALIDATED_FOR_PAPER_TEST"
      ? "#22c55e"
      : verdict.status === "REJECTED" || verdict.status === "THESIS_TOO_FRAGILE"
        ? "#ef4444"
        : "#f5b400";

  const isResearchOnly =
    current.assetType === "CRYPTO" || current.assetType === "NFT_COLLECTION";
  const canPaperTrade =
    !isResearchOnly &&
    verdict.status !== "REJECTED" &&
    verdict.status !== "THESIS_TOO_FRAGILE" &&
    current.status !== "PAPER_TRADED";

  const supported = analysis.assumptions.filter((a) => a.status === "SUPPORTED").length;
  const challenged = analysis.assumptions.filter((a) => a.status === "CHALLENGED").length;

  const scoreSeries = useMemo(
    () => buildScoreSeries(current.initialScore, current.currentScore, events),
    [current, events],
  );

  const agentTasks: AgentTask[] = useMemo(
    () => [
      { label: "Thesis extracted", detail: `${analysis.assumptions.length} assumptions identified` },
      { label: "Bull case constructed", detail: `${analysis.bullCase.length} points` },
      { label: "Bear case constructed", detail: `${analysis.bearCase.length} points` },
      { label: "Contrarian case constructed", detail: `${analysis.contrarianCase.length} points` },
      {
        label: analysis.dataMode === "live" ? "Alpaca market data retrieved" : "Market context modelled (demo)",
      },
      {
        label: "Evidence classified",
        detail: `${analysis.supportingEvidence.length} supporting · ${analysis.contradictoryEvidence.length} contradictory · ${analysis.uncertainEvidence.length} unknown`,
      },
      {
        label: "Risk checks completed",
        detail: `${analysis.riskFactors.length} risk factors`,
      },
      {
        label: `Thesis score calculated: ${analysis.score}/100`,
        detail: `Verdict: ${verdict.status.replace(/_/g, " ")}`,
      },
    ],
    [analysis, verdict],
  );

  const rechallenge = async () => {
    setMonitoring(true);
    setAgentStatus("CHALLENGING");
    try {
      const res = await fetch(`/api/theses/${current.id}/monitor`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        const fresh = await fetch(`/api/theses/${current.id}`).then((r) => r.json());
        if (fresh.ok) {
          const prev = current.currentScore;
          const next: number = fresh.data.thesis.currentScore;
          setCurrent({
            ...current,
            currentScore: next,
            status: fresh.data.thesis.status,
            analysis: fresh.data.thesis.analysis,
          });
          setEvents(fresh.data.events);
          setOrders(fresh.data.orders);
          if (next !== prev) {
            pushToast({
              kind: next > prev ? "success" : "warn",
              title: next > prev ? "Thesis strengthened" : "Thesis weakened",
              body: `Score ${prev} → ${next}`,
            });
          } else {
            pushToast({
              kind: "info",
              title: "Re-challenge complete",
              body: "No material change in this pass.",
            });
          }
        }
      }
    } finally {
      setMonitoring(false);
      setAgentStatus(current.status === "PAPER_TRADED" ? "MONITORING" : "READY");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
      <WorkflowStepper current={stage} />

      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>
          <ArrowLeft size={14} /> Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e222c] bg-[#0b0d12] font-mono text-xs font-bold">
            {current.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{current.symbol}</div>
            <div className="text-xs text-[#5e6472]">
              {current.timeHorizon} · Size ${Number(current.positionSize).toLocaleString()}
            </div>
          </div>
        </div>
        <span className={`chip ${current.direction === "long" ? "chip-bull" : "chip-bear"}`}>
          {current.direction === "long" ? "LONG" : "SHORT"}
        </span>
        <span className="chip chip-warn">Paper Mode</span>
        <span className="chip">
          {analysis.dataMode === "live" ? "Live Market Data" : "Demo Analysis"}
        </span>
        <ThesisTrendChip
          initial={current.initialScore}
          current={current.currentScore}
          status={current.status}
        />
        {current.status === "PAPER_TRADED" && (
          <span className="chip chip-bull">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-[#22c55e] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            </span>
            Monitoring active
          </span>
        )}
        <div className="ml-auto text-xs text-[#5e6472]">
          Created {new Date(current.createdAt).toLocaleString()}
        </div>
      </div>

      {/* VERDICT HERO */}
      <motion.div
        className="surface relative overflow-hidden p-6 md:p-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full"
          style={{ background: `radial-gradient(circle, ${verdictColor}22, transparent 60%)` }}
        />
        <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex justify-center">
            <ScoreRing score={current.currentScore} label={verdictBandLabel(verdict)} />
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
              Final Verdict
            </div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              {verdict.status === "VALIDATED_FOR_PAPER_TEST"
                ? "Thesis survived."
                : verdict.status === "REJECTED"
                  ? "Thesis rejected."
                  : verdict.status === "THESIS_TOO_FRAGILE"
                    ? "Thesis too fragile."
                    : "Thesis is testable, not confirmed."}
            </h1>
            <p className="mt-3 max-w-2xl text-[#9aa1ae]">{verdict.summary}</p>

            <ScoreExplainer breakdown={analysis.scoreBreakdown} />

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricPill label="Assumptions" value={analysis.assumptions.length} />
              <MetricPill label="Supported" value={supported} color="#22c55e" />
              <MetricPill label="Challenged" value={challenged} color="#ef4444" />
              <MetricPill label="Risk Factors" value={analysis.riskFactors.length} color="#f5b400" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {current.status === "PAPER_TRADED" ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#166534] bg-[#062513] px-4 py-2 text-sm text-[#86efac]">
                  <CheckCircle2 size={14} /> Paper trade active · monitoring engaged
                </div>
              ) : isResearchOnly ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#a67c00] bg-[#231a05] px-4 py-2 text-sm text-[#fcd34d]">
                  <ShieldAlert size={14} /> Research only · {current.assetType === "CRYPTO"
                    ? "Alpaca paper equity execution not used"
                    : "OpenSea data · no Alpaca order"}
                </div>
              ) : canPaperTrade ? (
                <button className="btn btn-bull" onClick={() => setOpenTrade(true)}>
                  Send to Alpaca Paper Trading →
                </button>
              ) : (
                <button className="btn btn-secondary" disabled title="Verdict blocks paper trade">
                  Paper Trade Locked
                </button>
              )}
              <button className="btn btn-secondary" onClick={rechallenge} disabled={monitoring}>
                {monitoring ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                {monitoring ? "Re-challenging…" : "Challenge Again"}
              </button>
              <Link href="/new" className="btn btn-ghost">
                <RotateCcw size={14} /> Edit Thesis
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agent activity + contradiction summary side-by-side */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <AgentActivity
          tasks={agentTasks}
          currentIndex={-1}
          title="Agent activity log"
          status={current.status === "PAPER_TRADED" ? "MONITORING" : "READY"}
        />
        <ContradictionCard analysis={analysis} />
      </div>

      {/* Three-column: original / assumptions / evidence */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr_1fr]">
        <SectionSurface delay={0.1}>
          <SectionTitle icon={<Sparkles size={14} />}>Original Thesis</SectionTitle>
          <p className="mt-3 rounded-lg border border-[#1e222c] bg-[#07080c] p-4 text-[15px] leading-relaxed text-[#cbd0da]">
            &ldquo;{current.originalText}&rdquo;
          </p>
          <div className="mt-3 text-[10px] text-[#5e6472]">
            Immutable — recorded {new Date(current.createdAt).toLocaleDateString()}. The original
            is preserved so you can compare it against later evidence.
          </div>

          <div className="mt-4 space-y-2 text-xs text-[#9aa1ae]">
            <div className="flex justify-between">
              <span className="text-[#5e6472]">Direction</span>
              <span className="uppercase">{current.direction}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5e6472]">Timeframe</span>
              <span>{current.timeHorizon}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5e6472]">Position Size</span>
              <span className="tabular">
                ${Number(current.positionSize).toLocaleString()}
              </span>
            </div>
          </div>

          {orig.score !== current.currentScore && (
            <div className="mt-5 rounded-lg border border-[#1e222c] bg-[#0a0c11] p-3 text-xs text-[#9aa1ae]">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                Then vs Now
              </div>
              <div>
                Original score{" "}
                <span className="text-white">{orig.score}</span> → current{" "}
                <span
                  className={
                    current.currentScore >= orig.score ? "text-[#22c55e]" : "text-[#ef4444]"
                  }
                >
                  {current.currentScore}
                </span>
              </div>
            </div>
          )}
        </SectionSurface>

        <SectionSurface delay={0.15}>
          <SectionTitle icon={<Swords size={14} />}>AI Red Team</SectionTitle>

          <div className="mt-4 space-y-3">
            {analysis.assumptions.map((a, i) => (
              <ExpandableAssumptionCard key={a.id} a={a} idx={i} />
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <CaseCard title="BULL CASE" color="#22c55e" items={analysis.bullCase} />
            <CaseCard title="BEAR CASE" color="#ef4444" items={analysis.bearCase} />
            <CaseCard title="CONTRARIAN" color="#f5b400" items={analysis.contrarianCase} />
          </div>
        </SectionSurface>

        <SectionSurface delay={0.2}>
          <SectionTitle icon={<CheckCircle2 size={14} />}>Supporting Evidence</SectionTitle>
          <ul className="mt-3 space-y-2">
            {analysis.supportingEvidence.map((e) => (
              <EvidenceRow key={e.id} item={e} />
            ))}
          </ul>

          <div className="mt-5">
            <SectionTitle icon={<XCircle size={14} />}>Contradictory Evidence</SectionTitle>
            <ul className="mt-3 space-y-2">
              {analysis.contradictoryEvidence.map((e) => (
                <EvidenceRow key={e.id} item={e} />
              ))}
              {analysis.contradictoryEvidence.length === 0 && (
                <li className="rounded-md border border-dashed border-[#2a2f3c] bg-[#0a0c11] p-3 text-xs text-[#5e6472]">
                  No contradictions detected in current pass.
                </li>
              )}
            </ul>
          </div>

          <div className="mt-5">
            <SectionTitle icon={<HelpCircle size={14} />}>Missing Evidence</SectionTitle>
            <ul className="mt-3 space-y-2">
              {analysis.missingEvidence.map((m, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-dashed border-[#2a2f3c] bg-[#0a0c11] p-2.5 text-xs text-[#9aa1ae]"
                >
                  <Circle size={10} className="mt-1 text-[#5e6472]" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <SectionTitle icon={<ShieldAlert size={14} />}>Risk Factors</SectionTitle>
            <ul className="mt-3 space-y-2">
              {analysis.riskFactors.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-[#1e222c] bg-[#0a0c11] p-2.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                    <span>{r.category}</span>
                    <span
                      style={{
                        color:
                          r.severity === "HIGH"
                            ? "#ef4444"
                            : r.severity === "MEDIUM"
                              ? "#f5b400"
                              : "#9aa1ae",
                      }}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#cbd0da]">{r.text}</div>
                </li>
              ))}
            </ul>
          </div>
        </SectionSurface>
      </div>

      {/* Recommendation footer */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <RecCard title="Strongest Support" body={verdict.strongestFactor} color="#22c55e" />
        <RecCard title="Weakest Assumption" body={verdict.weakestAssumption} color="#ef4444" />
        <RecCard title="Biggest Risk" body={verdict.largestRisk} color="#f5b400" />
        <RecCard title="Next Action" body={verdict.nextAction} color="#9aa1ae" />
      </div>

      {/* What would prove you wrong? */}
      <div className="mt-6">
        <InvalidationCard conditions={analysis.invalidations} />
      </div>

      {/* Monitoring / thesis-strength timeline */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <motion.div
          className="surface p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity size={14} /> Thesis Strength Over Time
              </div>
              <div className="text-xs text-[#5e6472]">
                Score at each re-challenge. Original score is fixed.
              </div>
            </div>
            <button className="btn btn-secondary text-xs" onClick={rechallenge} disabled={monitoring}>
              {monitoring ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Re-challenge
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <AreaChart data={scoreSeries} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="ts-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#3b4252" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#3b4252" fontSize={10} tickLine={false} axisLine={false} domain={[30, 100]} />
                <Tooltip
                  contentStyle={{ background: "#0b0d12", border: "1px solid #1e222c", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9aa1ae" }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={current.currentScore >= current.initialScore ? "#22c55e" : "#ef4444"}
                  fill="url(#ts-fill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="surface p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-3 text-sm font-semibold text-white">Monitoring Timeline</div>
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {events.length === 0 && (
              <li className="rounded-md border border-dashed border-[#2a2f3c] p-3 text-center text-xs text-[#5e6472]">
                Timeline populates as the thesis is monitored.
              </li>
            )}
            {events.map((ev) => (
              <TimelineRow key={ev.id} ev={ev} onOpen={() => setSelectedEvent(ev)} />
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Linked orders */}
      {orders.length > 0 && (
        <div className="mt-6 surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e222c] p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity size={14} /> Thesis ↔ Position
              </div>
              <div className="mt-0.5 text-xs text-[#9aa1ae]">
                Why do I own this position?{" "}
                <span className="text-white">
                  Because this thesis (score {current.initialScore} at entry, now {current.currentScore})
                  passed the risk gate.
                </span>
              </div>
            </div>
            <Link href="/trading" className="text-xs text-[#9aa1ae] hover:text-white">
              Open paper trading →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#1e222c] text-[10px] uppercase tracking-widest text-[#5e6472]">
                  <th className="p-3 text-left">Alpaca Order ID</th>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Side</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Est. Price</th>
                  <th className="p-3 text-left">Mode</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[#12141b] hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-xs text-white">
                      {o.alpacaOrderId ?? o.id.slice(0, 8)}
                    </td>
                    <td className="p-3 font-mono font-semibold text-white">{o.symbol}</td>
                    <td className="p-3">
                      <span className={o.side === "buy" ? "chip chip-bull" : "chip chip-bear"}>
                        {o.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular">{o.qty}</td>
                    <td className="p-3 text-right tabular">
                      ${Number(o.estimatedPrice ?? 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={o.mode === "live" ? "chip chip-bull" : "chip"}>
                        {o.mode === "live" ? "ALPACA LIVE" : "DEMO"}
                      </span>
                    </td>
                    <td className="p-3">
                      <OrderStatus status={o.status} />
                    </td>
                    <td className="p-3 text-[#7a8091]">{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaperTradePreview
        open={openTrade}
        onClose={() => setOpenTrade(false)}
        thesisId={current.id}
        symbol={current.symbol}
        direction={current.direction}
        positionSize={current.positionSize}
        score={current.currentScore}
        verdictStatus={verdict.status}
        onSubmitted={async () => {
          pushToast({
            kind: "success",
            title: "Paper order submitted",
            body: `${current.symbol} · linked to thesis`,
          });
          const fresh = await fetch(`/api/theses/${current.id}`).then((r) => r.json());
          if (fresh.ok) {
            setCurrent({
              ...current,
              currentScore: fresh.data.thesis.currentScore,
              status: fresh.data.thesis.status,
              analysis: fresh.data.thesis.analysis,
            });
            setOrders(fresh.data.orders);
            setEvents(fresh.data.events);
            setAgentStatus("MONITORING");
          }
        }}
      />

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

/* ---------- helpers ---------- */

function verdictBandLabel(v: Verdict): string {
  if (v.band === "HIGH_CONVICTION") return "HIGH CONVICTION";
  return v.band;
}

function ThesisTrendChip({
  initial,
  current,
  status,
}: {
  initial: number;
  current: number;
  status: string;
}) {
  if (status === "INVALIDATED") return <span className="chip chip-bear">INVALIDATED</span>;
  const delta = current - initial;
  if (delta <= -15) return <span className="chip chip-bear">WEAKENING</span>;
  if (delta >= 10) return <span className="chip chip-bull">STRONG</span>;
  if (Math.abs(delta) < 4) return <span className="chip">STABLE</span>;
  return delta > 0 ? (
    <span className="chip chip-bull">STRENGTHENING</span>
  ) : (
    <span className="chip chip-warn">SOFTENING</span>
  );
}

function SectionSurface({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      className="surface p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9aa1ae]">
      <span className="text-[#5e6472]">{icon}</span>
      {children}
    </div>
  );
}

function MetricPill({ label, value, color = "#e7e9ee" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-[#1e222c] bg-[#0a0c11] px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
        {label}
      </div>
      <div className="mt-0.5 font-display text-2xl font-semibold tabular" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function CaseCard({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#1e222c] bg-[#07080c] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-xs leading-relaxed text-[#cbd0da]">
            · {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  const color =
    item.kind === "supporting" ? "#22c55e" : item.kind === "contradictory" ? "#ef4444" : "#f5b400";
  return (
    <li className="rounded-md border border-[#1e222c] bg-[#0a0c11] p-3">
      <div className="flex items-start gap-2">
        <div
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">{item.title}</div>
          <div className="mt-0.5 text-xs text-[#cbd0da]">{item.summary}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
        <SourceBadge kind={item.sourceKind} />
        <span
          className="rounded px-1.5 py-0.5"
          style={{
            color: confidenceColor(item.confidence),
            background: `${confidenceColor(item.confidence)}18`,
          }}
        >
          {item.confidence} CONF
        </span>
        <span
          className="rounded px-1.5 py-0.5"
          style={{ color: impactColor(item.impact), background: `${impactColor(item.impact)}18` }}
        >
          {item.impact} IMPACT
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[#7a8091]">
          {item.source} <ExternalLink size={10} />
        </span>
      </div>
    </li>
  );
}

function SourceBadge({ kind }: { kind: EvidenceItem["sourceKind"] }) {
  if (kind === "FACT") return <span className="chip chip-bull">FACT</span>;
  if (kind === "INTERPRETATION") return <span className="chip chip-warn">AI INTERPRETATION</span>;
  return <span className="chip">DEMO</span>;
}

function confidenceColor(c: Confidence) {
  if (c === "HIGH") return "#22c55e";
  if (c === "MEDIUM") return "#f5b400";
  if (c === "LOW") return "#ef4444";
  return "#9aa1ae";
}
function impactColor(i: Impact) {
  if (i === "HIGH") return "#ef4444";
  if (i === "MEDIUM") return "#f5b400";
  return "#9aa1ae";
}

function RecCard({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <div className="surface p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
        {title}
      </div>
      <div className="mt-1.5 text-sm text-[#cbd0da]">{body}</div>
    </div>
  );
}

function TimelineRow({ ev, onOpen }: { ev: EventRow; onOpen: () => void }) {
  const color = eventColor(ev.kind);
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full rounded-md border border-[#1e222c] bg-[#0a0c11] p-3 text-left transition hover:border-[#2a2f3c] hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color }}
          >
            {ev.kind.replace(/_/g, " ")}
          </span>
          <span className="ml-auto text-[10px] text-[#5e6472]">
            {new Date(ev.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="mt-1 text-xs text-[#cbd0da]">{ev.message}</div>
        {ev.scoreBefore != null && ev.scoreAfter != null && ev.scoreBefore !== ev.scoreAfter && (
          <div className="mt-1 text-[11px] tabular text-[#7a8091]">
            Score {ev.scoreBefore} →{" "}
            <span
              style={{ color: ev.scoreAfter >= ev.scoreBefore ? "#22c55e" : "#ef4444" }}
            >
              {ev.scoreAfter}
            </span>
          </div>
        )}
      </button>
    </li>
  );
}

function EventDetailModal({ event, onClose }: { event: EventRow | null; onClose: () => void }) {
  if (!event) return null;
  const color = eventColor(event.kind);
  const meta = (event.meta ?? {}) as {
    weakenedAssumptions?: string[];
    strengthenedAssumptions?: string[];
    newContradictions?: string[];
    assumption?: string;
    title?: string;
    alpacaOrderId?: string;
    clientOrderId?: string;
    mode?: string;
  };
  const weakened = meta.weakenedAssumptions ?? [];
  const strengthened = meta.strengthenedAssumptions ?? [];
  const newContras = meta.newContradictions ?? [];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        className="surface w-full max-w-lg p-6"
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {event.kind.replace(/_/g, " ")}
        </div>
        <div className="mt-2 font-display text-xl text-white">{eventTitle(event.kind)}</div>
        <p className="mt-2 text-sm text-[#cbd0da]">{event.message}</p>

        <div className="mt-4 rounded-lg border border-[#1e222c] bg-[#07080c] p-3 text-xs text-[#9aa1ae]">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
            What changed?
          </div>
          {event.scoreBefore != null && event.scoreAfter != null && event.scoreBefore !== event.scoreAfter ? (
            <div className="mb-2">
              Thesis score moved from{" "}
              <span className="text-white">{event.scoreBefore}</span> →{" "}
              <span
                style={{ color: event.scoreAfter >= event.scoreBefore ? "#22c55e" : "#ef4444" }}
              >
                {event.scoreAfter}
              </span>
              . The original thesis text was not modified.
            </div>
          ) : null}

          {weakened.length > 0 && (
            <DiffList label="Weakened assumptions" items={weakened} color="#ef4444" />
          )}
          {strengthened.length > 0 && (
            <DiffList label="Strengthened assumptions" items={strengthened} color="#22c55e" />
          )}
          {newContras.length > 0 && (
            <DiffList label="New contradictions" items={newContras} color="#ef4444" />
          )}
          {meta.assumption && (
            <div className="mt-2 rounded border border-[#1e222c] bg-[#0a0c11] p-2">
              <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">Assumption</div>
              <div className="mt-0.5 text-white">{meta.assumption}</div>
            </div>
          )}
          {meta.title && (
            <div className="mt-2 rounded border border-[#1e222c] bg-[#0a0c11] p-2">
              <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">Signal</div>
              <div className="mt-0.5 text-white">{meta.title}</div>
            </div>
          )}
          {meta.alpacaOrderId && (
            <div className="mt-2 rounded border border-[#1e222c] bg-[#0a0c11] p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#5e6472]">
                  Order · {meta.mode === "live" ? "Alpaca Paper" : "Demo Broker"}
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-white">{meta.alpacaOrderId}</div>
            </div>
          )}
          {weakened.length + strengthened.length + newContras.length === 0 &&
            !meta.assumption &&
            !meta.title &&
            !meta.alpacaOrderId &&
            (event.scoreBefore == null || event.scoreBefore === event.scoreAfter) && (
              <div>
                Event recorded for the timeline. No underlying assumption or evidence change.
              </div>
            )}
        </div>
        <div className="mt-4 flex justify-end">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DiffList({
  label,
  items,
  color,
}: {
  label: string;
  items: string[];
  color: string;
}) {
  return (
    <div className="mb-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
        {label}
      </div>
      <ul className="mt-1 space-y-1">
        {items.map((it, i) => (
          <li
            key={i}
            className="rounded border border-[#1e222c] bg-[#0a0c11] px-2 py-1 text-[11px] text-[#cbd0da]"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function eventColor(kind: string): string {
  if (kind.includes("STRENGTHEN") || kind === "PAPER_ORDER_FILLED") return "#22c55e";
  if (kind.includes("WEAKENED") || kind === "CONTRADICTION_DETECTED" || kind === "INVALIDATION_TRIGGERED")
    return "#ef4444";
  if (kind === "PAPER_ORDER_SUBMITTED") return "#22c55e";
  if (kind === "THESIS_RE_CHALLENGED") return "#f5b400";
  return "#9aa1ae";
}
function eventTitle(kind: string): string {
  return kind
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function OrderStatus({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "filled") return <span className="chip chip-bull">FILLED</span>;
  if (s === "rejected" || s === "canceled") return <span className="chip chip-bear">{status.toUpperCase()}</span>;
  return <span className="chip chip-warn">{status.toUpperCase()}</span>;
}

function buildScoreSeries(initial: number, current: number, events: EventRow[]) {
  const scoreEvents = [...events]
    .filter((e) => e.scoreAfter != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const series: { label: string; score: number }[] = [{ label: "Initial", score: initial }];
  for (const e of scoreEvents) {
    series.push({
      label: new Date(e.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      }),
      score: e.scoreAfter ?? initial,
    });
  }
  if (series[series.length - 1].score !== current) {
    series.push({ label: "Now", score: current });
  }
  return series;
}
