import { NextRequest } from "next/server";
import { db } from "@/db";
import { theses } from "@/db/schema";
import { desc } from "drizzle-orm";
import { extractThesis, runPipeline } from "@/lib/agents/pipeline";
import { logEvent } from "@/lib/monitor";
import type { Direction } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(theses).orderBy(desc(theses.createdAt)).limit(100);
    return Response.json({ ok: true, data: rows });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/theses
 *
 * Creates a thesis in the CHALLENGED state:
 * 1. Extract structured claim
 * 2. Run full agent pipeline (evidence + red team + score + verdict)
 * 3. Persist with an immutable original snapshot AND a mutable "latest" analysis
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawAssetType = String(body?.assetType ?? "STOCK").toUpperCase();
    const assetType = (["STOCK", "ETF", "CRYPTO", "NFT_COLLECTION"].includes(rawAssetType)
      ? rawAssetType
      : "STOCK") as "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";
    const symbolRaw = String(body?.symbol ?? "").trim();
    const symbol =
      assetType === "NFT_COLLECTION" ? symbolRaw.toLowerCase() : symbolRaw.toUpperCase();
    const originalText = String(body?.originalText ?? "").trim();
    const direction: Direction = body?.direction === "short" ? "short" : "long";
    if (!symbol || !originalText) {
      return Response.json(
        { ok: false, error: "symbol and originalText are required" },
        { status: 400 },
      );
    }
    if (assetType === "STOCK" || assetType === "ETF") {
      if (!/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(symbol)) {
        return Response.json({ ok: false, error: "Invalid stock symbol format" }, { status: 400 });
      }
    }
    if (assetType === "CRYPTO" && !/^[A-Z0-9/]{2,20}$/.test(symbol)) {
      return Response.json({ ok: false, error: "Invalid crypto symbol format" }, { status: 400 });
    }
    if (assetType === "NFT_COLLECTION" && !/^[a-z0-9-]{2,60}$/.test(symbol)) {
      return Response.json({ ok: false, error: "Invalid NFT collection slug" }, { status: 400 });
    }

    const timeHorizon = String(body?.timeHorizon ?? "3-6M");
    const positionSize = String(body?.positionSize ?? "1000");
    const riskTolerance = String(body?.riskTolerance ?? "moderate");
    const catalysts = body?.catalysts ? String(body.catalysts) : null;
    const expectedOutcome = body?.expectedOutcome ? String(body.expectedOutcome) : null;

    // Stage 1: extraction (also used as the initial editable structure)
    const extraction = extractThesis({
      symbol,
      direction,
      timeHorizon,
      originalText,
      catalysts: catalysts ?? undefined,
      expectedOutcome: expectedOutcome ?? undefined,
      assetType,
    });

    // Optional user-edited assumptions (from the "Extraction" step in the UI)
    if (Array.isArray(body?.assumptions) && body.assumptions.length > 0) {
      extraction.assumptions = body.assumptions.slice(0, 8).map((a: unknown, i: number) => {
        const rec = a as { id?: string; text?: string; weight?: number };
        return {
          id: rec.id ?? `a_${i}`,
          text: String(rec.text ?? "").trim(),
          weight: Math.max(1, Math.min(5, Number(rec.weight ?? 3))),
          status: "UNCERTAIN",
          reasoning: "",
        };
      }).filter((a: { text: string }) => a.text.length > 0);
    }

    // Stage 2-7: full pipeline
    const analysis = await runPipeline({
      symbol,
      direction,
      timeHorizon,
      originalText,
      catalysts: catalysts ?? undefined,
      expectedOutcome: expectedOutcome ?? undefined,
      extractionOverride: extraction,
      assetType,
    });

    const status =
      analysis.verdict.status === "VALIDATED_FOR_PAPER_TEST"
        ? "VALIDATED"
        : analysis.verdict.status === "REJECTED" || analysis.verdict.status === "THESIS_TOO_FRAGILE"
          ? "INVALIDATED"
          : "NEEDS_EVIDENCE";

    const [row] = await db
      .insert(theses)
      .values({
        symbol,
        assetType,
        direction,
        timeHorizon,
        positionSize,
        riskTolerance,
        originalText,
        catalysts,
        expectedOutcome,
        originalAnalysis: analysis,
        originalExtraction: extraction,
        initialScore: analysis.score,
        analysis,
        currentScore: analysis.score,
        status,
      })
      .returning();

    await logEvent(row.id, {
      kind: "THESIS_CREATED",
      message: `Thesis created with initial score ${analysis.score}/100.`,
      scoreAfter: analysis.score,
    });

    return Response.json({ ok: true, data: row });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
