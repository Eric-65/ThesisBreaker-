import { NextRequest } from "next/server";
import { db } from "@/db";
import { theses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runRiskGate } from "@/lib/risk";
import type { AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/theses/[id]/preview-order
 *
 * Runs the deterministic risk gate for the given thesis without touching
 * Alpaca. Returns the calculated quantity, notional, and each individual
 * check so the UI can show a clear PAPER TRADE PREVIEW.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const [row] = await db.select().from(theses).where(eq(theses.id, id)).limit(1);
    if (!row) return Response.json({ ok: false, error: "not found" }, { status: 404 });
    const url = new URL(req.url);
    const brokerMode = url.searchParams.get("brokerMode") === "demo" ? "demo" : "alpaca";

    const analysis = row.analysis as AnalysisResult;
    let gate = await runRiskGate({
      symbol: row.symbol,
      direction: row.direction as "long" | "short",
      positionSizeUsd: Number(row.positionSize),
      verdict: analysis.verdict,
    });

    if (!gate.ok && brokerMode === "demo") {
      const fails = gate.checks.filter((c) => c.status === "FAIL");
      const onlyPriceOrQty = fails.every(
        (c) => c.key === "market_price" || c.key === "quantity",
      );
      if (onlyPriceOrQty) {
        const demoPrice = 100;
        const qty = Math.max(1, Math.floor(Number(row.positionSize) / demoPrice));
        gate = {
          ...gate,
          ok: true,
          blockedReason: undefined,
          estimatedPrice: demoPrice,
          quantity: qty,
          estimatedNotional: qty * demoPrice,
          checks: gate.checks.map((c) =>
            c.key === "market_price"
              ? {
                  ...c,
                  status: "WARN" as const,
                  detail:
                    "No live provider price. Demo Broker path uses a clearly-labeled $100 demo price for order sizing.",
                }
              : c.key === "quantity"
                ? {
                    ...c,
                    status: "PASS" as const,
                    detail: `${qty} share${qty === 1 ? "" : "s"} at demo $${demoPrice}.`,
                  }
                : c,
          ),
        };
      }
    }

    return Response.json({
      ok: true,
      data: {
        thesis: {
          id: row.id,
          symbol: row.symbol,
          direction: row.direction,
          score: row.currentScore,
          verdict: analysis.verdict,
          positionSize: row.positionSize,
        },
        gate,
        brokerMode,
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
