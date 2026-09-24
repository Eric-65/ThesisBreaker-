"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import type { RiskGateResult } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  thesisId: string;
  symbol: string;
  direction: "long" | "short";
  positionSize: string;
  score: number;
  verdictStatus: string;
  onSubmitted?: (result: { id: string; alpacaOrderId: string | null; status: string; mode: string }) => void;
}

type BrokerMode = "alpaca" | "demo";

type Stage = "loading" | "preview" | "submitting" | "submitted" | "blocked" | "error";

interface PreviewData {
  thesis: {
    id: string;
    symbol: string;
    direction: string;
    score: number;
    verdict: { status: string; score: number };
    positionSize: string;
  };
  gate: RiskGateResult;
}

export function PaperTradePreview({
  open,
  onClose,
  thesisId,
  symbol,
  direction,
  score,
  verdictStatus,
  onSubmitted,
}: Props) {
  const [stage, setStage] = useState<Stage>("loading");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    id: string;
    alpacaOrderId: string | null;
    status: string;
    mode: string;
    symbol: string;
    side: string;
    qty: string;
  } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [alpacaConnected, setAlpacaConnected] = useState<boolean | null>(null);
  const [brokerMode, setBrokerMode] = useState<BrokerMode>("alpaca");

  useEffect(() => {
    if (!open) return;
    // fresh idempotency key per open
    setIdempotencyKey(`tb_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`);
    setStage("loading");
    setPreview(null);
    setError(null);
    setSubmitted(null);
    (async () => {
      try {
        // Check broker connectivity first so we can display honest mode chip
        const st = await fetch("/api/alpaca/status").then((r) => r.json()).catch(() => null);
        const connected = !!st?.connected;
        setAlpacaConnected(connected);
        setBrokerMode(connected ? "alpaca" : "demo");
      } catch {
        // network error — leave defaults
      }
    })();
  }, [open, thesisId]);

  // Re-fetch preview whenever brokerMode changes (or when opening).
  useEffect(() => {
    if (!open) return;
    (async () => {
      setStage("loading");
      try {
        const res = await fetch(
          `/api/theses/${thesisId}/preview-order?brokerMode=${brokerMode}`,
          { method: "POST" },
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "Preview failed");
        setPreview(json.data);
        setStage(json.data.gate.ok ? "preview" : "blocked");
      } catch (err) {
        setError((err as Error).message);
        setStage("error");
      }
    })();
  }, [open, thesisId, brokerMode]);

  const submit = async () => {
    if (!preview) return;
    setStage("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/theses/${thesisId}/paper-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey, brokerMode }),
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.blocked) {
          setPreview((p) => (p ? { ...p, gate: json.gate } : p));
          setStage("blocked");
          setError(json.reason ?? "Risk gate blocked the order.");
          return;
        }
        throw new Error(json.error ?? "Order failed");
      }
      setSubmitted({
        id: json.data.id,
        alpacaOrderId: json.data.alpacaOrderId,
        status: json.data.status,
        mode: json.mode,
        symbol: json.data.symbol,
        side: json.data.side,
        qty: json.data.qty,
      });
      setStage("submitted");
      onSubmitted?.({
        id: json.data.id,
        alpacaOrderId: json.data.alpacaOrderId,
        status: json.data.status,
        mode: json.mode,
      });
    } catch (err) {
      setError((err as Error).message);
      setStage("error");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="surface relative w-full max-w-lg overflow-hidden p-0"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-[#9aa1ae] hover:bg-white/5 hover:text-white"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex flex-wrap items-center gap-2 border-b border-[#1e222c] bg-[#08090d] px-6 py-3">
              <span className="chip chip-warn">Paper Trade Preview</span>
              {alpacaConnected === false ? (
                <span className="chip chip-bear">Alpaca Not Connected</span>
              ) : (
                <span className="chip chip-bull">Alpaca Paper</span>
              )}
              {brokerMode === "demo" && <span className="chip">Demo Broker</span>}
              {preview?.gate && (
                <span className="chip">
                  Price · {priceStatusFromGate(preview)}
                </span>
              )}
              <div className="ml-auto text-[10px] uppercase tracking-widest text-[#5e6472]">
                {symbol.toUpperCase()} · {direction.toUpperCase()}
              </div>
            </div>

            <div className="p-6">
              {stage === "loading" && (
                <div className="flex items-center gap-3 py-8 text-sm text-[#9aa1ae]">
                  <Loader2 size={16} className="animate-spin" /> Checking paper account &
                  computing risk gate…
                </div>
              )}

              {stage === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-[#7f1d1d] bg-[#210a0a] p-3 text-sm text-[#fca5a5]">
                  <AlertTriangle size={14} /> {error ?? "Something went wrong."}
                </div>
              )}

              {(stage === "preview" || stage === "submitting" || stage === "blocked") &&
                preview && (
                  <>
                    {alpacaConnected === false && (
                      <div className="mb-3 rounded-lg border border-[#a67c00] bg-[#231a05] p-3 text-xs text-[#fcd34d]">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest">
                          <AlertTriangle size={12} /> Alpaca Paper broker not connected
                        </div>
                        <p className="mt-1">
                          Set <code>ALPACA_API_KEY</code> + <code>ALPACA_SECRET_KEY</code> on the server
                          to submit through Alpaca. To proceed anyway with an explicit demo broker
                          simulation, confirm below.
                        </p>
                        <label className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={brokerMode === "demo"}
                            onChange={(e) => setBrokerMode(e.target.checked ? "demo" : "alpaca")}
                          />
                          <span>Use Demo Broker (simulated, clearly labeled)</span>
                        </label>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Cell label="Ticker" value={preview.thesis.symbol} />
                      <Cell
                        label="Side"
                        value={direction === "long" ? "BUY" : "SELL"}
                        color={direction === "long" ? "#22c55e" : "#ef4444"}
                      />
                      <Cell label="Quantity" value={String(preview.gate.quantity)} />
                      <Cell
                        label="Est. Price"
                        value={`$${preview.gate.estimatedPrice.toFixed(2)}`}
                      />
                      <Cell
                        label="Estimated Value"
                        value={`$${preview.gate.estimatedNotional.toFixed(2)}`}
                      />
                      <Cell
                        label="Buying Power"
                        value={`$${preview.gate.buyingPower.toLocaleString()}`}
                      />
                      <Cell
                        label="Thesis Score"
                        value={`${score}/100`}
                        color={score >= 75 ? "#22c55e" : score >= 60 ? "#f5b400" : "#ef4444"}
                      />
                      <Cell
                        label="Status"
                        value={verdictStatus.replace(/_/g, " ")}
                        color={
                          verdictStatus === "VALIDATED_FOR_PAPER_TEST"
                            ? "#22c55e"
                            : verdictStatus === "NEEDS_MORE_EVIDENCE"
                              ? "#f5b400"
                              : "#ef4444"
                        }
                      />
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                        <ShieldCheck size={12} /> Risk Gate
                      </div>
                      <ul className="space-y-1.5">
                        {preview.gate.checks.map((c) => (
                          <li
                            key={c.key}
                            className="flex items-start gap-2 rounded-md border border-[#1e222c] bg-[#0a0c11] p-2 text-xs"
                          >
                            {c.status === "PASS" ? (
                              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#22c55e]" />
                            ) : c.status === "WARN" ? (
                              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#f5b400]" />
                            ) : (
                              <XCircle size={13} className="mt-0.5 shrink-0 text-[#ef4444]" />
                            )}
                            <div className="flex-1">
                              <div className="text-[#cbd0da]">{c.label}</div>
                              <div className="text-[11px] text-[#7a8091]">{c.detail}</div>
                            </div>
                            <span
                              className="text-[10px] font-semibold uppercase tracking-widest"
                              style={{
                                color:
                                  c.status === "PASS"
                                    ? "#22c55e"
                                    : c.status === "WARN"
                                      ? "#f5b400"
                                      : "#ef4444",
                              }}
                            >
                              {c.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {stage === "blocked" && (
                      <div className="mt-4 rounded-lg border border-[#7f1d1d] bg-[#210a0a] p-3 text-sm text-[#fca5a5]">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest">
                          <AlertTriangle size={12} /> Paper trade blocked
                        </div>
                        <div className="mt-1 text-xs">
                          {error ?? preview.gate.blockedReason ?? "Risk gate did not pass."}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={stage === "submitting"}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-bull"
                        onClick={submit}
                        disabled={
                          stage !== "preview" ||
                          !preview.gate.ok ||
                          (alpacaConnected === false && brokerMode !== "demo")
                        }
                      >
                        {stage === "submitting" ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Submitting paper order…
                          </>
                        ) : (
                          "Confirm Paper Trade"
                        )}
                      </button>
                    </div>
                  </>
                )}

              {stage === "submitted" && submitted && (
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#166534] bg-[#062513] text-[#86efac]">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="mt-4 font-display text-2xl text-white">
                    Paper Order Submitted
                  </h3>
                  <p className="mt-1 text-sm text-[#9aa1ae]">
                    Simulated {submitted.mode === "live" ? "via Alpaca paper" : "via demo executor"} — not a real market order.
                  </p>
                  <div className="mt-4 space-y-1.5 rounded-lg border border-[#1e222c] bg-[#07080c] p-4 text-left text-xs">
                    <Row label="Alpaca Order ID" value={submitted.alpacaOrderId ?? "—"} mono />
                    <Row label="Symbol" value={submitted.symbol} />
                    <Row label="Side" value={submitted.side.toUpperCase()} />
                    <Row label="Qty" value={submitted.qty} />
                    <Row label="Status" value={submitted.status.toUpperCase()} colored="#22c55e" />
                    <Row label="Created" value={new Date().toLocaleString()} />
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button className="btn btn-secondary" onClick={onClose}>
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[#1e222c] bg-[#0a0c11] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
        {label}
      </div>
      <div
        className="mt-1 tabular text-sm font-semibold text-white"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  colored,
  mono,
}: {
  label: string;
  value: string;
  colored?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#5e6472]">{label}</span>
      <span
        className={`${mono ? "font-mono" : ""} tabular text-white`}
        style={colored ? { color: colored } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function priceStatusFromGate(p: PreviewData): string {
  const mp = p.gate.checks.find((c) => c.key === "market_price");
  if (!mp) return "UNKNOWN";
  if (mp.status === "PASS") return "LIVE";
  if (mp.status === "WARN") return "STALE";
  return "UNAVAILABLE";
}
