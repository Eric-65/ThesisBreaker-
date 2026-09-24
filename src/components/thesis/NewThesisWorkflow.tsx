"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Info,
  Pencil,
  Plus,
  Sparkles,
  Swords,
  Trash2,
  Zap,
} from "lucide-react";
import type { Assumption, Direction, Extraction } from "@/lib/types";
import { WorkflowStepper } from "./WorkflowStepper";
import { setAgentStatus } from "../AgentStatus";
import { pushToast } from "../toasts";
import { AgentActivity } from "./AgentActivity";

const HORIZONS = ["1W", "1M", "3-6M", "6-12M", "1Y+"];
const RISK = ["conservative", "moderate", "aggressive"];

const PROCESSING_STAGES = [
  "Reading thesis...",
  "Extracting assumptions...",
  "Constructing bear case...",
  "Searching for contradictory evidence...",
  "Testing assumptions...",
  "Checking risk...",
  "Calculating thesis strength...",
  "Building verdict...",
];

type Step = "form" | "extraction" | "processing";

type AssetTypeUI = "STOCK" | "CRYPTO" | "NFT_COLLECTION";

interface FormState {
  symbol: string;
  assetType: AssetTypeUI;
  direction: Direction;
  timeHorizon: string;
  positionSize: string;
  riskTolerance: string;
  originalText: string;
  catalysts: string;
  expectedOutcome: string;
}

const DEFAULT_FORM: FormState = {
  symbol: "NVDA",
  assetType: "STOCK",
  direction: "long",
  timeHorizon: "3-6M",
  positionSize: "5000",
  riskTolerance: "moderate",
  originalText:
    "I believe NVIDIA will outperform over the next three months because AI infrastructure spending will continue to grow and NVIDIA will maintain strong demand and pricing power.",
  catalysts: "Q4 earnings, GTC keynote, hyperscaler capex guides",
  expectedOutcome: "15-25% upside over the next 3 months",
};

export function NewThesisWorkflow() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [processingStage, setProcessingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill from ?symbol=X and ?assetType=Y passed by the Market page
  useEffect(() => {
    const s = params.get("symbol");
    const at = params.get("assetType") as AssetTypeUI | null;
    if (!s) return;
    const assetType: AssetTypeUI =
      at === "CRYPTO" || at === "NFT_COLLECTION" || at === "STOCK" ? at : "STOCK";
    const norm = assetType === "NFT_COLLECTION" ? s.toLowerCase() : s.toUpperCase();
    const starter =
      assetType === "NFT_COLLECTION"
        ? `I believe the ${norm} collection may strengthen because...`
        : `I think ${norm} will outperform because...`;
    setForm((f) => ({
      ...f,
      symbol: norm,
      assetType,
      originalText: starter,
    }));
  }, [params]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Stage 1 → 2: extract only, then let the user review
  const extract = async () => {
    setError(null);
    if (!form.symbol.trim() || !form.originalText.trim()) {
      setError("Please enter a symbol and a thesis.");
      return;
    }
    const validSymbol =
      form.assetType === "NFT_COLLECTION"
        ? /^[a-z0-9-]{2,60}$/.test(form.symbol.trim().toLowerCase())
        : form.assetType === "CRYPTO"
          ? /^[A-Z0-9/]{2,20}$/.test(form.symbol.trim().toUpperCase())
          : /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/i.test(form.symbol.trim());
    if (!validSymbol) {
      setError(
        form.assetType === "NFT_COLLECTION"
          ? "NFT collection slug looks invalid. Example: pudgypenguins"
          : form.assetType === "CRYPTO"
            ? "Crypto pair looks invalid. Example: BTC/USDT"
            : "Symbol format looks invalid. Example: NVDA",
      );
      return;
    }
    setBusy(true);
    setAgentStatus("ANALYZING");
    try {
      const symbol =
        form.assetType === "NFT_COLLECTION"
          ? form.symbol.trim().toLowerCase()
          : form.symbol.trim().toUpperCase();
      const res = await fetch("/api/theses/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, symbol, assetType: form.assetType }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Extraction failed");
      setExtraction(json.data as Extraction);
      setStep("extraction");
      setAgentStatus("READY");
    } catch (err) {
      setError((err as Error).message);
      setAgentStatus("IDLE");
    } finally {
      setBusy(false);
    }
  };

  // One-click demo: seed the flagship NVDA thesis and open the workspace
  const runDemo = async () => {
    setError(null);
    setBusy(true);
    setAgentStatus("ANALYZING");
    try {
      const res = await fetch("/api/theses/demo", { method: "POST" });
      const json = await res.json();
      if (!json.ok || !json.data?.id) throw new Error(json.error ?? "Demo failed");
      pushToast({
        kind: "agent",
        title: "Demo thesis created",
        body: `NVDA · initial score ${json.data.currentScore}/100`,
      });
      router.push(`/thesis/${json.data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setAgentStatus("IDLE");
      setBusy(false);
    }
  };

  // Stage 2 → 3: red team + persist
  const breakThesis = async () => {
    if (!extraction) return;
    setError(null);
    setStep("processing");
    setProcessingStage(0);
    setAgentStatus("CHALLENGING");

    // Fire the request immediately; run staged UI in parallel with min duration
    const symbol =
      form.assetType === "NFT_COLLECTION"
        ? form.symbol.trim().toLowerCase()
        : form.symbol.trim().toUpperCase();
    const submit = fetch("/api/theses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        symbol,
        assetType: form.assetType,
        assumptions: extraction.assumptions,
      }),
    })
      .then((r) => r.json())
      .catch((err) => ({ ok: false, error: (err as Error).message }));

    // Vary status per stage for the persistent header badge
    const stageStatus = [
      "ANALYZING",
      "CHALLENGING",
      "CHALLENGING",
      "RESEARCHING",
      "VALIDATING",
      "RISK CHECKING",
      "VALIDATING",
      "READY",
    ] as const;

    for (let i = 1; i < PROCESSING_STAGES.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 550));
      setProcessingStage(i);
      setAgentStatus(stageStatus[i] ?? "ANALYZING");
    }

    const res = await submit;
    if (!res?.ok || !res.data?.id) {
      setError(res?.error ?? "Analysis temporarily unavailable. Your thesis draft has been kept.");
      setStep("extraction");
      setAgentStatus("IDLE");
      pushToast({
        kind: "error",
        title: "Analysis failed",
        body: "Try again — your thesis draft is safe.",
      });
      return;
    }
    pushToast({
      kind: "agent",
      title: "Verdict ready",
      body: `${form.symbol.toUpperCase()} · score ${res.data.currentScore}/100`,
    });
    router.push(`/thesis/${res.data.id}`);
  };

  return (
    <div>
      <WorkflowStepper current={step === "form" ? "thesis" : step === "extraction" ? "challenge" : "evidence"} />

      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1e222c] bg-[#0a0c11]/70 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-[#9aa1ae]">
                <Zap size={12} className="text-[#f5b400]" />
                Judging or in a hurry?
                <span className="text-[#5e6472]">Skip typing and try the flagship walkthrough.</span>
              </div>
              <button className="btn btn-secondary text-xs" onClick={runDemo} disabled={busy}>
                <Sparkles size={12} /> Try Demo (NVDA)
              </button>
            </div>
            <ThesisFormStage form={form} update={update} error={error} onNext={extract} busy={busy} />
          </motion.div>
        )}

        {step === "extraction" && extraction && (
          <motion.div
            key="extraction"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <ExtractionStage
              extraction={extraction}
              setExtraction={setExtraction}
              onBack={() => setStep("form")}
              onNext={breakThesis}
              symbol={form.symbol}
              direction={form.direction}
              error={error}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ProcessingModal open={step === "processing"} stage={processingStage} symbol={form.symbol} />
    </div>
  );
}

/* ---------------- Stage 1: Form ---------------- */

function ThesisFormStage({
  form,
  update,
  error,
  onNext,
  busy,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  error: string | null;
  onNext: () => void;
  busy: boolean;
}) {
  const isNft = form.assetType === "NFT_COLLECTION";
  const isCrypto = form.assetType === "CRYPTO";
  return (
    <div className="surface p-6 md:p-8">
      <div className="mb-5">
        <label className="label">Asset Type</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "STOCK", label: "Stock / ETF", hint: "Alpaca paper" },
              { key: "CRYPTO", label: "Crypto", hint: "Binance data · research" },
              { key: "NFT_COLLECTION", label: "NFT Collection", hint: "OpenSea data · research" },
            ] as { key: AssetTypeUI; label: string; hint: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => update("assetType", t.key)}
              className={`flex-1 min-w-[140px] rounded-lg border px-4 py-3 text-left transition ${
                form.assetType === t.key
                  ? "border-[#2a2f3c] bg-white/[0.06]"
                  : "border-[#1e222c] bg-[#0a0c11] hover:border-[#2a2f3c]"
              }`}
            >
              <div className="text-sm font-semibold text-white">{t.label}</div>
              <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">
                {t.hint}
              </div>
            </button>
          ))}
        </div>
        {form.assetType !== "STOCK" && (
          <div className="mt-2 text-[11px] text-[#f5b400]">
            {form.assetType === "CRYPTO"
              ? "Crypto theses are analysed with live Binance/CoinGecko data. Paper trading in this build routes only to Alpaca equities."
              : "NFT theses are RESEARCH ONLY — analysed with live OpenSea collection data. No paper order."}
          </div>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="label">
            {isNft ? "Collection Slug" : isCrypto ? "Pair" : "Ticker / Asset"}
          </label>
          <input
            className={`input font-mono ${isNft ? "" : "uppercase"}`}
            value={form.symbol}
            onChange={(e) =>
              update(
                "symbol",
                isNft ? e.target.value.toLowerCase() : e.target.value.toUpperCase(),
              )
            }
            placeholder={isNft ? "pudgypenguins" : isCrypto ? "BTC/USDT" : "NVDA"}
            maxLength={isNft ? 60 : 16}
          />
        </div>
        <div>
          <label className="label">Direction</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update("direction", "long")}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                form.direction === "long"
                  ? "border-[#166534] bg-[#062513] text-[#86efac]"
                  : "border-[#1e222c] bg-[#0a0c11] text-[#9aa1ae] hover:text-white"
              }`}
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => update("direction", "short")}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                form.direction === "short"
                  ? "border-[#7f1d1d] bg-[#210a0a] text-[#fca5a5]"
                  : "border-[#1e222c] bg-[#0a0c11] text-[#9aa1ae] hover:text-white"
              }`}
            >
              Short
            </button>
          </div>
        </div>
        <div>
          <label className="label">Time Horizon</label>
          <div className="flex flex-wrap gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => update("timeHorizon", h)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide ${
                  form.timeHorizon === h
                    ? "border-[#2a2f3c] bg-white/[0.06] text-white"
                    : "border-[#1e222c] bg-[#0a0c11] text-[#9aa1ae] hover:text-white"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">
            {isNft ? "Research size (informational)" : "Position Size (USD)"}
          </label>
          <input
            className="input tabular"
            value={form.positionSize}
            onChange={(e) => update("positionSize", e.target.value.replace(/[^0-9.]/g, ""))}
            disabled={isNft}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Investment Thesis</label>
          <textarea
            className="textarea"
            value={form.originalText}
            onChange={(e) => update("originalText", e.target.value)}
            placeholder="I think NVDA will outperform because…"
            rows={5}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-[#5e6472]">
            <span>Plain English. State what must be true.</span>
            <span className="tabular">{form.originalText.length} chars</span>
          </div>
        </div>
        <div>
          <label className="label">Catalysts (optional)</label>
          <input
            className="input"
            value={form.catalysts}
            onChange={(e) => update("catalysts", e.target.value)}
            placeholder="Earnings, product launch, macro event…"
          />
        </div>
        <div>
          <label className="label">Expected Outcome (optional)</label>
          <input
            className="input"
            value={form.expectedOutcome}
            onChange={(e) => update("expectedOutcome", e.target.value)}
            placeholder="e.g. 15-25% upside within 6 months"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Risk Tolerance</label>
          <div className="flex gap-2">
            {RISK.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => update("riskTolerance", r)}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold capitalize ${
                  form.riskTolerance === r
                    ? "border-[#2a2f3c] bg-white/[0.06] text-white"
                    : "border-[#1e222c] bg-[#0a0c11] text-[#9aa1ae] hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#7f1d1d] bg-[#210a0a] p-3 text-sm text-[#fca5a5]">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary text-base" onClick={onNext} disabled={busy}>
          <Sparkles size={16} /> {busy ? "Extracting…" : "Extract Structure →"}
        </button>
        <div className="text-xs text-[#5e6472]">
          Next: review the extracted assumptions before the red team runs.
        </div>
      </div>
    </div>
  );
}

/* ---------------- Stage 2: Extraction Review ---------------- */

function ExtractionStage({
  extraction,
  setExtraction,
  onBack,
  onNext,
  symbol,
  direction,
  error,
}: {
  extraction: Extraction;
  setExtraction: (e: Extraction) => void;
  onBack: () => void;
  onNext: () => void;
  symbol: string;
  direction: Direction;
  error: string | null;
}) {
  const patchAssumption = (i: number, patch: Partial<Assumption>) => {
    const next = extraction.assumptions.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    setExtraction({ ...extraction, assumptions: next });
  };
  const removeAssumption = (i: number) => {
    setExtraction({
      ...extraction,
      assumptions: extraction.assumptions.filter((_, idx) => idx !== i),
    });
  };
  const addAssumption = () => {
    setExtraction({
      ...extraction,
      assumptions: [
        ...extraction.assumptions,
        {
          id: `a_${Date.now()}`,
          text: "",
          weight: 3,
          status: "UNCERTAIN",
          reasoning: "",
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="surface p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="chip">Step 02</span>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#1e222c] bg-[#0b0d12] font-mono text-xs font-bold">
              {symbol.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{symbol.toUpperCase()}</div>
              <div className="text-xs text-[#5e6472]">
                {direction.toUpperCase()} · {extraction.timeHorizon}
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-[#9aa1ae]">
            <Info size={12} /> You can edit assumptions before we red-team them.
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
            Main claim
          </div>
          <div className="mt-1 rounded-lg border border-[#1e222c] bg-[#07080c] p-3 text-sm text-white">
            {extraction.mainClaim}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
              Catalysts
            </div>
            <ul className="mt-2 space-y-1.5">
              {extraction.catalysts.map((c, i) => (
                <li
                  key={i}
                  className="rounded-md border border-[#1e222c] bg-[#0a0c11] px-3 py-1.5 text-xs text-[#cbd0da]"
                >
                  · {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
              Invalidation Conditions
            </div>
            <ul className="mt-2 space-y-1.5">
              {extraction.invalidationConditions.map((c, i) => (
                <li
                  key={i}
                  className="rounded-md border border-[#1e222c] bg-[#0a0c11] px-3 py-1.5 text-xs text-[#cbd0da]"
                >
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="surface p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Pencil size={14} /> Assumptions
            </div>
            <div className="mt-1 text-xs text-[#9aa1ae]">
              These are the load-bearing claims. Edit or remove any that don&rsquo;t match your view.
            </div>
          </div>
          <button className="btn btn-secondary text-xs" onClick={addAssumption}>
            <Plus size={12} /> Add
          </button>
        </div>

        <ul className="space-y-2">
          {extraction.assumptions.map((a, i) => (
            <li
              key={a.id}
              className="rounded-lg border border-[#1e222c] bg-[#0a0c11] p-3"
            >
              <div className="flex items-center gap-2">
                <span className="tabular text-[10px] font-semibold text-[#5e6472]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  className="input flex-1"
                  value={a.text}
                  onChange={(e) => patchAssumption(i, { text: e.target.value })}
                  placeholder="Assumption text…"
                />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-[#5e6472]">Weight</span>
                  <div className="relative">
                    <select
                      className="select appearance-none pr-6"
                      value={a.weight}
                      onChange={(e) => patchAssumption(i, { weight: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#5e6472]"
                    />
                  </div>
                </div>
                <button
                  className="rounded-md p-2 text-[#7a8091] hover:bg-white/5 hover:text-[#fca5a5]"
                  onClick={() => removeAssumption(i)}
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
          {extraction.assumptions.length === 0 && (
            <li className="rounded-lg border border-dashed border-[#2a2f3c] p-4 text-center text-xs text-[#5e6472]">
              No assumptions yet — add at least one before running the red team.
            </li>
          )}
        </ul>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#7f1d1d] bg-[#210a0a] p-3 text-sm text-[#fca5a5]">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <button
          className="btn btn-primary text-base"
          onClick={onNext}
          disabled={extraction.assumptions.length === 0}
        >
          <Swords size={16} /> BREAK MY THESIS
        </button>
        <div className="text-xs text-[#5e6472]">
          Runs bull / bear / contrarian + evidence + score.
        </div>
      </div>
    </div>
  );
}

/* ---------------- Stage 3: Processing Modal ---------------- */

function ProcessingModal({
  open,
  stage,
  symbol,
}: {
  open: boolean;
  stage: number;
  symbol: string;
}) {
  const tasks = PROCESSING_STAGES.map((label) => ({ label }));
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="surface relative w-full max-w-lg p-6 md:p-8"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ef4444]">
              <Sparkles size={14} /> Prove Me Wrong
            </div>
            <div className="font-display text-2xl leading-tight text-white">
              I&rsquo;m actively searching for reasons this trade could{" "}
              <span className="text-[#ef4444]">fail</span> on{" "}
              <span className="font-mono">{symbol.toUpperCase()}</span>.
            </div>
            <div className="mt-6">
              <AgentActivity tasks={tasks} currentIndex={stage} compact status="CHALLENGING" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#5e6472]">
              <ArrowRight size={12} /> Verdict, evidence, and risk gate — building now.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


