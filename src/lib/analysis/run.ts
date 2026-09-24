import "server-only";
import { createHash } from "node:crypto";
import { isDbConfigured } from "@/db";
import { qwenConfig } from "@/lib/env";
import { getMarketSnapshot } from "@/lib/market";
import { QwenError, extractJsonObject, qwenChat, type QwenUsage } from "@/lib/qwen";
import { heuristicAnalysis } from "./heuristic";
import { normalizeIdea, parseIdea } from "./parseIdea";
import { PROMPT_VERSION, buildMessages } from "./prompt";
import { findCachedResult, logQwenCall, saveResult } from "./repo";
import { guardVerdict, overallFragility, pickWeakest } from "./scoring";
import { QwenAnalysisSchema, type MarketSnapshot, type StreamEvent, type StressTestResult } from "./types";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const MAX_IDEA_CHARS = 1200;

type Emit = (e: StreamEvent) => void;

/** Models sometimes pack several tagged facts into one string; show one fact per bullet. */
export function splitEvidence(items: string[]): string[] {
  return items
    .flatMap((s) => s.split(/\s+(?=\[(?:Bitget market data|General knowledge)\])/i))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function inputHash(idea: string, model: string): string {
  return createHash("sha256").update(`${PROMPT_VERSION}|${model}|${normalizeIdea(idea)}`).digest("hex");
}

/**
 * The full stress test. Emits progress events as it goes and always ends with
 * exactly one `result` event (Qwen, cached Qwen, or offline heuristic) unless
 * the request itself is cancelled.
 */
export async function runStressTest(ideaRaw: string, emit: Emit, signal?: AbortSignal): Promise<void> {
  const idea = ideaRaw.trim().slice(0, MAX_IDEA_CHARS);
  const cfg = qwenConfig();
  const hash = inputHash(idea, cfg.model);
  const notices: string[] = [];
  const dbOn = isDbConfigured();

  emit({ type: "step", id: "parse", status: "active" });
  const parsed = parseIdea(idea);
  emit({
    type: "step",
    id: "parse",
    status: "done",
    detail: [parsed.symbol ?? "no ticker found", parsed.direction, parsed.horizon].filter(Boolean).join(" · "),
  });

  // 1. Cache: repeated demo runs of the same idea don't spend credits.
  if (cfg.apiKey && dbOn) {
    emit({ type: "step", id: "cache", status: "active" });
    try {
      const hit = await findCachedResult(hash, CACHE_MAX_AGE_MS);
      if (hit) {
        emit({ type: "step", id: "cache", status: "done", detail: "reused a Qwen result from the last 24h" });
        await logQwenCall({ thesisId: hit.id, inputHash: hash, model: cfg.model, status: "cache_hit" });
        emit({ type: "result", result: { ...hit, cached: true, notices: ["Cached result — no Qwen credits spent."] } });
        return;
      }
      emit({ type: "step", id: "cache", status: "done", detail: "no recent run" });
    } catch (err) {
      emit({ type: "step", id: "cache", status: "failed", detail: (err as Error).message });
    }
  } else {
    emit({ type: "step", id: "cache", status: "skipped" });
  }

  // 2. Market evidence.
  let market: MarketSnapshot | null = null;
  if (parsed.symbol) {
    emit({ type: "step", id: "market", status: "active" });
    market = await getMarketSnapshot(parsed.symbol, parsed.assetClass);
    emit({ type: "market", market });
    emit({
      type: "step",
      id: "market",
      status: market.error ? "failed" : "done",
      detail: market.error ?? `${market.exchangeSymbol} · ${market.ticker?.last}`,
    });
    if (market.error) notices.push(`Live price data unavailable: ${market.error}`);
  } else {
    emit({ type: "step", id: "market", status: "skipped", detail: "no ticker in the idea" });
    notices.push("No ticker recognized, so no live price evidence was used.");
  }

  // 3. Qwen (streamed), validated with zod. Any failure → offline heuristic.
  let result: Omit<StressTestResult, "id" | "createdAt" | "cached" | "notices"> | null = null;
  let pendingLog: Parameters<typeof logQwenCall>[0] | null = null;

  if (cfg.apiKey) {
    emit({ type: "step", id: "extract", status: "active", detail: `${cfg.model}${cfg.enableThinking ? " · thinking" : ""}` });
    let seen = 0;
    let buffer = "";
    let usage: QwenUsage | null = null;
    let stage: "extract" | "score" = "extract";
    try {
      const out = await qwenChat({
        messages: buildMessages(idea, parsed, market),
        json: true,
        stream: true,
        temperature: 0.2,
        maxTokens: 2400,
        signal,
        onDelta: (channel, text) => {
          emit({ type: "delta", channel, text });
          if (channel !== "content") return;
          buffer += text;
          const found = [...buffer.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g)];
          for (const m of found.slice(seen)) {
            emit({ type: "assumption", text: m[1].replace(/\\"/g, '"') });
          }
          seen = found.length;
        },
      });
      usage = out.usage;
      emit({ type: "step", id: "extract", status: "done", detail: usage ? `${usage.totalTokens} tokens` : undefined });

      stage = "score";
      emit({ type: "step", id: "score", status: "active" });
      const parsedJson = QwenAnalysisSchema.parse(extractJsonObject(out.content));
      // Re-number ids so the UI and DB are consistent regardless of what the model used.
      const idMap = new Map(parsedJson.assumptions.map((a, i) => [a.id, `A${i + 1}`]));
      const list = parsedJson.assumptions.map((a, i) => ({
        ...a,
        id: `A${i + 1}`,
        evidenceFor: splitEvidence(a.evidenceFor),
        evidenceAgainst: splitEvidence(a.evidenceAgainst),
      }));
      const guard = guardVerdict(parsedJson.verdict, list);
      if (guard.note) notices.push(guard.note);
      result = {
        idea,
        symbol: parsed.symbol ?? parsedJson.symbol?.toUpperCase() ?? null,
        assetClass: market?.assetClass ?? parsed.assetClass,
        direction: parsedJson.direction,
        horizon: parsedJson.horizon ?? parsed.horizon,
        assumptions: list,
        verdict: guard.verdict,
        fragility: overallFragility(list),
        weakestAssumptionId: pickWeakest(list, idMap.get(parsedJson.weakestAssumptionId) ?? parsedJson.weakestAssumptionId),
        whatMustBeTrue: parsedJson.whatMustBeTrue,
        summary: parsedJson.summary,
        market,
        engine: "qwen",
        model: out.model,
      };
      emit({ type: "step", id: "score", status: "done" });
      pendingLog = { inputHash: hash, model: out.model, status: "ok", usage, latencyMs: out.latencyMs };
    } catch (err) {
      if (err instanceof QwenError && err.kind === "aborted") return;
      const reason =
        err instanceof QwenError
          ? err.message
          : err instanceof Error && err.name === "ZodError"
            ? "Qwen's answer did not match the expected schema"
            : `Qwen output could not be parsed (${(err as Error).message})`;
      emit({ type: "step", id: stage, status: "failed", detail: reason });
      notices.push(`Qwen unavailable — showing the offline heuristic instead. (${reason})`);
      pendingLog = { inputHash: hash, model: cfg.model, status: "error", usage, error: reason };
    }
  } else {
    emit({ type: "step", id: "extract", status: "skipped", detail: "no BITGET_QWEN_API_KEY — offline heuristic" });
    notices.push("Offline heuristic — Qwen is not configured on this server.");
  }

  if (!result) {
    emit({ type: "step", id: "score", status: "active", detail: "offline heuristic" });
    const h = heuristicAnalysis(idea, parsed, market);
    result = {
      idea,
      symbol: parsed.symbol,
      assetClass: market?.assetClass ?? parsed.assetClass,
      ...h,
      market,
      engine: "offline",
      model: null,
    };
    emit({ type: "step", id: "score", status: "done" });
  }

  // 4. Persist (best effort — the verdict is still shown if the DB is down).
  let id: string | null = null;
  let createdAt = new Date().toISOString();
  if (dbOn) {
    emit({ type: "step", id: "save", status: "active" });
    try {
      ({ id, createdAt } = await saveResult(result, hash));
      emit({ type: "step", id: "save", status: "done" });
    } catch (err) {
      emit({ type: "step", id: "save", status: "failed", detail: (err as Error).message });
      notices.push("Could not save this run to history.");
    }
  } else {
    emit({ type: "step", id: "save", status: "skipped", detail: "DATABASE_URL not set" });
    notices.push("History is disabled because DATABASE_URL is not set.");
  }
  if (pendingLog && dbOn) await logQwenCall({ ...pendingLog, thesisId: id });

  emit({ type: "result", result: { ...result, id, createdAt, cached: false, notices } });
}
