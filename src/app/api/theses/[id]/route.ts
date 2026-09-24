import { NextRequest } from "next/server";
import { db } from "@/db";
import { theses, orders, monitoringEvents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const [row] = await db.select().from(theses).where(eq(theses.id, id)).limit(1);
    if (!row) return Response.json({ ok: false, error: "not found" }, { status: 404 });

    const [linkedOrders, events] = await Promise.all([
      db.select().from(orders).where(eq(orders.thesisId, id)).orderBy(desc(orders.createdAt)),
      db
        .select()
        .from(monitoringEvents)
        .where(eq(monitoringEvents.thesisId, id))
        .orderBy(desc(monitoringEvents.createdAt))
        .limit(200),
    ]);

    return Response.json({ ok: true, data: { thesis: row, orders: linkedOrders, events } });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
