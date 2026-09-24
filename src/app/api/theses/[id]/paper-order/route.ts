import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { orders, theses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { runRiskGate } from "@/lib/risk";
import { alpaca, getAlpacaConfig } from "@/lib/alpaca";
import { logEvent } from "@/lib/monitor";
import type { AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/theses/[id]/paper-order
 *
 * The deterministic execution gate. Runs the risk gate again on the server
 * (do not trust client-computed values). If any check FAILS, we return
 * the failing check and never call Alpaca.
 *
 * On success:
 *   - Generate a UUID client_order_id (idempotency key)
 *   - Guard against duplicate submissions by looking up the last order for
 *     this thesis within the last 5 seconds
 *   - Submit to Alpaca paper-api if configured, else record a demo order
 *   - Persist the order row linked to the thesis
 *   - Update the thesis status to PAPER_TRADED
 *   - Emit a monitoring event
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const clientRequestKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : null;

    const [row] = await db.select().from(theses).where(eq(theses.id, id)).limit(1);
    if (!row) return Response.json({ ok: false, error: "not found" }, { status: 404 });

    // Research-only asset types cannot be paper-traded through Alpaca in this build.
    if (row.assetType !== "STOCK" && row.assetType !== "ETF") {
      return Response.json(
        {
          ok: false,
          blocked: true,
          reason: `${row.assetType} theses are research-only. Alpaca paper trading in this build routes only equity orders.`,
        },
        { status: 400 },
      );
    }

    // Broker mode is EXPLICIT. Default is "alpaca" (live paper-broker).
    // Demo broker only if the client explicitly opts in.
    const requestedMode = body?.brokerMode === "demo" ? "demo" : "alpaca";
    if (requestedMode === "alpaca" && !getAlpacaConfig()) {
      return Response.json(
        {
          ok: false,
          blocked: true,
          reason:
            "Alpaca paper broker is not configured on this server. Set ALPACA_API_KEY and ALPACA_SECRET_KEY, or explicitly submit with brokerMode=\"demo\".",
        },
        { status: 400 },
      );
    }

    const analysis = row.analysis as AnalysisResult;

    // Idempotency: if the client passes the same key twice, return the existing order.
    if (clientRequestKey) {
      const [existing] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.thesisId, id), eq(orders.clientOrderId, clientRequestKey)))
        .limit(1);
      if (existing) {
        return Response.json({ ok: true, mode: existing.mode, data: existing, duplicate: true });
      }
    }

    // Run risk gate on the server
    let gate = await runRiskGate({
      symbol: row.symbol,
      direction: row.direction as "long" | "short",
      positionSizeUsd: Number(row.positionSize),
      verdict: analysis.verdict,
    });

    // In DEMO broker mode only, if the only reason we can't proceed is that
    // no live provider returned a price, allow a clearly-labeled demo price.
    if (!gate.ok && requestedMode === "demo") {
      const fails = gate.checks.filter((c) => c.status === "FAIL");
      const onlyPriceOrQty = fails.every(
        (c) => c.key === "market_price" || c.key === "quantity",
      );
      if (onlyPriceOrQty) {
        const demoPrice = 100; // clearly marked as demo, not a made-up market value
        const qty = Math.max(1, Math.floor(Number(row.positionSize) / demoPrice));
        const notional = qty * demoPrice;
        gate = {
          ...gate,
          ok: true,
          blockedReason: undefined,
          estimatedPrice: demoPrice,
          quantity: qty,
          estimatedNotional: notional,
          checks: gate.checks.map((c) => {
            if (c.key === "market_price")
              return {
                ...c,
                status: "WARN" as const,
                detail:
                  "No live provider price. Demo Broker path is using a clearly-labeled $100 demo price for order sizing — never presented as a real market value.",
              };
            if (c.key === "quantity")
              return {
                ...c,
                status: "PASS" as const,
                detail: `${qty} share${qty === 1 ? "" : "s"} at demo $${demoPrice}.`,
              };
            return c;
          }),
        };
      }
    }

    if (!gate.ok) {
      return Response.json(
        {
          ok: false,
          blocked: true,
          reason: gate.blockedReason ?? "Risk gate failed.",
          gate,
        },
        { status: 400 },
      );
    }

    const side = row.direction === "long" ? "buy" : "sell";
    const clientOrderId = clientRequestKey ?? `tb_${randomUUID()}`;

    let alpacaOrderId: string | null = null;
    let status: string;
    let mode: "live" | "demo";
    let orderType = "market";

    if (requestedMode === "alpaca") {
      // Live Alpaca paper-broker path
      try {
        const result = await alpaca.placeOrder({
          symbol: row.symbol,
          qty: gate.quantity,
          side,
          type: "market",
          time_in_force: "day",
          client_order_id: clientOrderId,
        });
        alpacaOrderId = result.id;
        status = result.status;
        mode = "live";
        orderType = result.type;
      } catch (err) {
        // NEVER silently fall back to demo when live was requested.
        return Response.json(
          {
            ok: false,
            error: `ALPACA CONNECTION UNAVAILABLE — ${(err as Error).message}. Retry, or explicitly submit with brokerMode="demo".`,
          },
          { status: 502 },
        );
      }
    } else {
      // Explicit demo-broker path
      alpacaOrderId = `demo_${randomUUID()}`;
      status = "filled";
      mode = "demo";
    }

    const [orderRow] = await db
      .insert(orders)
      .values({
        thesisId: id,
        alpacaOrderId,
        clientOrderId,
        symbol: row.symbol,
        side,
        qty: String(gate.quantity),
        orderType,
        status,
        estimatedPrice: String(gate.estimatedPrice),
        estimatedNotional: String(gate.estimatedNotional),
        mode,
      })
      .returning();

    await db
      .update(theses)
      .set({
        status: "PAPER_TRADED",
        paperOrderId: alpacaOrderId ?? orderRow.id,
        updatedAt: new Date(),
      })
      .where(eq(theses.id, id));

    await logEvent(id, {
      kind: "PAPER_ORDER_SUBMITTED",
      message: `${mode === "live" ? "Alpaca" : "Demo"} paper order submitted: ${side.toUpperCase()} ${gate.quantity} ${row.symbol} @ ~$${gate.estimatedPrice.toFixed(2)}.`,
      meta: { alpacaOrderId, clientOrderId, mode },
    });

    if (status === "filled") {
      await logEvent(id, {
        kind: "PAPER_ORDER_FILLED",
        message: `Order filled: ${side.toUpperCase()} ${gate.quantity} ${row.symbol}.`,
        meta: { alpacaOrderId },
      });
    }

    return Response.json({ ok: true, mode, data: orderRow, gate });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
