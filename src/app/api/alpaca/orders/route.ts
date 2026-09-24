import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { alpaca, demoAlpaca, isAlpacaConfigured } from "@/lib/alpaca";
import { db } from "@/db";
import { theses } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAlpacaConfigured()) {
    return Response.json({ ok: true, mode: "demo", data: demoAlpaca.orders() });
  }
  try {
    const data = await alpaca.getOrders();
    return Response.json({ ok: true, mode: "live", data });
  } catch (err) {
    return Response.json(
      { ok: false, mode: "demo", data: demoAlpaca.orders(), error: (err as Error).message },
      { status: 200 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, qty, side, thesisId } = body ?? {};
    if (!symbol || !qty || !side) {
      return Response.json({ ok: false, error: "symbol, qty, side required" }, { status: 400 });
    }
    const clientOrderId = `tb_${randomUUID()}`;
    if (isAlpacaConfigured()) {
      try {
        const order = await alpaca.placeOrder({
          symbol: String(symbol).toUpperCase(),
          qty: Number(qty),
          side: side === "sell" ? "sell" : "buy",
          type: "market",
          time_in_force: "day",
          client_order_id: clientOrderId,
        });
        if (thesisId) {
          await db
            .update(theses)
            .set({ paperOrderId: order.id, status: "PAPER_TRADED", updatedAt: new Date() })
            .where(eq(theses.id, thesisId));
        }
        return Response.json({ ok: true, mode: "live", data: order });
      } catch (err) {
        return Response.json(
          { ok: false, mode: "demo", error: (err as Error).message },
          { status: 500 },
        );
      }
    }

    // Demo: fake immediate fill
    const demoOrder = {
      id: `demo_${randomUUID()}`,
      client_order_id: clientOrderId,
      symbol: String(symbol).toUpperCase(),
      qty: String(qty),
      side: side === "sell" ? "sell" : "buy",
      type: "market",
      status: "filled",
      filled_qty: String(qty),
      submitted_at: new Date().toISOString(),
    };
    if (thesisId) {
      await db
        .update(theses)
        .set({ paperOrderId: demoOrder.id, status: "PAPER_TRADED", updatedAt: new Date() })
        .where(eq(theses.id, thesisId));
    }
    return Response.json({ ok: true, mode: "demo", data: demoOrder });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
