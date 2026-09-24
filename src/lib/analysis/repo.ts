import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { assumptions as assumptionsT, qwenCalls, theses, type Thesis } from "@/db/schema";
import type { QwenUsage } from "@/lib/qwen";
import type {
  Assumption,
  AssetClass,
  Direction,
  Engine,
  MarketSnapshot,
  StressTestResult,
  Verdict,
} from "./types";

type NewResult = Omit<StressTestResult, "id" | "createdAt" | "cached" | "notices">;

export async function saveResult(r: NewResult, inputHash: string): Promise<{ id: string; createdAt: string }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const weakest = r.assumptions.find((a) => a.id === r.weakestAssumptionId);
    const [row] = await tx
      .insert(theses)
      .values({
        symbol: r.symbol,
        assetType: r.assetClass,
        direction: r.direction,
        timeHorizon: r.horizon,
        originalText: r.idea,
        verdict: r.verdict,
        fragility: r.fragility,
        weakestAssumption: weakest?.text ?? null,
        whatMustBeTrue: r.whatMustBeTrue,
        summary: r.summary,
        marketSnapshot: r.market,
        engine: r.engine,
        model: r.model,
        inputHash,
      })
      .returning({ id: theses.id, createdAt: theses.createdAt });
    await tx.insert(assumptionsT).values(
      r.assumptions.map((a, i) => ({
        thesisId: row.id,
        position: i,
        text: a.text,
        category: a.category,
        evidenceFor: a.evidenceFor,
        evidenceAgainst: a.evidenceAgainst,
        status: a.status,
        fragility: a.fragility,
      })),
    );
    return { id: row.id, createdAt: row.createdAt.toISOString() };
  });
}

function toResult(t: Thesis, rows: (typeof assumptionsT.$inferSelect)[]): StressTestResult {
  const list: Assumption[] = rows.map((a) => ({
    id: `A${a.position + 1}`,
    text: a.text,
    category: a.category as Assumption["category"],
    evidenceFor: a.evidenceFor,
    evidenceAgainst: a.evidenceAgainst,
    status: a.status as Assumption["status"],
    fragility: a.fragility,
  }));
  const weakest = list.find((a) => a.text === t.weakestAssumption) ?? list[0];
  return {
    id: t.id,
    idea: t.originalText,
    symbol: t.symbol,
    assetClass: (t.assetType as AssetClass | null) ?? null,
    direction: (t.direction as Direction | null) ?? "neutral",
    horizon: t.timeHorizon,
    assumptions: list,
    verdict: t.verdict as Verdict,
    fragility: t.fragility ?? 0,
    weakestAssumptionId: weakest?.id ?? "A1",
    whatMustBeTrue: t.whatMustBeTrue ?? [],
    summary: t.summary ?? "",
    market: (t.marketSnapshot as MarketSnapshot | null) ?? null,
    engine: (t.engine as Engine | null) ?? "offline",
    model: t.model,
    cached: false,
    notices: [],
    createdAt: t.createdAt.toISOString(),
  };
}

export async function getResult(id: string): Promise<StressTestResult | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = getDb();
  const [t] = await db
    .select()
    .from(theses)
    .where(and(eq(theses.id, id), isNotNull(theses.verdict)));
  if (!t) return null;
  const rows = await db
    .select()
    .from(assumptionsT)
    .where(eq(assumptionsT.thesisId, id))
    .orderBy(asc(assumptionsT.position));
  return toResult(t, rows);
}

/** Most recent Qwen-produced result for the same normalized input, within `maxAgeMs`. */
export async function findCachedResult(inputHash: string, maxAgeMs: number): Promise<StressTestResult | null> {
  const db = getDb();
  const [t] = await db
    .select({ id: theses.id })
    .from(theses)
    .where(
      and(
        eq(theses.inputHash, inputHash),
        eq(theses.engine, "qwen"),
        isNotNull(theses.verdict),
        gte(theses.createdAt, new Date(Date.now() - maxAgeMs)),
      ),
    )
    .orderBy(desc(theses.createdAt))
    .limit(1);
  return t ? getResult(t.id) : null;
}

export interface HistoryRow {
  id: string;
  idea: string;
  symbol: string | null;
  verdict: Verdict;
  fragility: number;
  weakestAssumption: string | null;
  engine: Engine;
  createdAt: string;
}

export async function listHistory(verdict?: Verdict, limit = 100): Promise<HistoryRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: theses.id,
      idea: theses.originalText,
      symbol: theses.symbol,
      verdict: theses.verdict,
      fragility: theses.fragility,
      weakestAssumption: theses.weakestAssumption,
      engine: theses.engine,
      createdAt: theses.createdAt,
    })
    .from(theses)
    .where(verdict ? eq(theses.verdict, verdict) : inArray(theses.verdict, ["PASS", "REVISE", "BLOCK"]))
    .orderBy(desc(theses.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    verdict: r.verdict as Verdict,
    fragility: r.fragility ?? 0,
    engine: (r.engine as Engine | null) ?? "offline",
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function logQwenCall(entry: {
  thesisId?: string | null;
  inputHash: string;
  model: string;
  status: "ok" | "error" | "cache_hit";
  usage?: QwenUsage | null;
  latencyMs?: number;
  error?: string;
}): Promise<void> {
  try {
    await getDb()
      .insert(qwenCalls)
      .values({
        thesisId: entry.thesisId ?? null,
        inputHash: entry.inputHash,
        model: entry.model,
        status: entry.status,
        promptTokens: entry.usage?.promptTokens ?? (entry.status === "cache_hit" ? 0 : null),
        completionTokens: entry.usage?.completionTokens ?? (entry.status === "cache_hit" ? 0 : null),
        reasoningTokens: entry.usage?.reasoningTokens ?? null,
        totalTokens: entry.usage?.totalTokens ?? (entry.status === "cache_hit" ? 0 : null),
        latencyMs: entry.latencyMs ?? null,
        error: entry.error?.slice(0, 500) ?? null,
      });
  } catch (err) {
    console.error("[qwen_calls] failed to log usage:", (err as Error).message);
  }
}
