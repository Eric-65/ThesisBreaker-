import { notFound } from "next/navigation";
import { db } from "@/db";
import { monitoringEvents, orders, theses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { BackgroundFx } from "@/components/BackgroundFx";
import { AppShell } from "@/components/AppShell";
import { ThesisWorkspace } from "@/components/thesis/ThesisWorkspace";
import type { AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ThesisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row] = await db.select().from(theses).where(eq(theses.id, id)).limit(1);
  if (!row) notFound();

  const [linkedOrders, events] = await Promise.all([
    db.select().from(orders).where(eq(orders.thesisId, id)).orderBy(desc(orders.createdAt)),
    db
      .select()
      .from(monitoringEvents)
      .where(eq(monitoringEvents.thesisId, id))
      .orderBy(desc(monitoringEvents.createdAt))
      .limit(200),
  ]);

  const analysis = row.analysis as AnalysisResult;
  const originalAnalysis = row.originalAnalysis as AnalysisResult;

  return (
    <>
      <BackgroundFx />
      <AppShell>
        <ThesisWorkspace
          thesis={{
            id: row.id,
            symbol: row.symbol,
            assetType: row.assetType as "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION",
            direction: row.direction as "long" | "short",
            timeHorizon: row.timeHorizon,
            positionSize: row.positionSize,
            originalText: row.originalText,
            status: row.status,
            initialScore: row.initialScore,
            currentScore: row.currentScore,
            createdAt: row.createdAt.toISOString(),
            analysis,
            originalAnalysis,
          }}
          orders={linkedOrders.map((o) => ({
            id: o.id,
            alpacaOrderId: o.alpacaOrderId,
            clientOrderId: o.clientOrderId,
            symbol: o.symbol,
            side: o.side,
            qty: String(o.qty),
            status: o.status,
            mode: o.mode,
            estimatedPrice: o.estimatedPrice != null ? String(o.estimatedPrice) : null,
            estimatedNotional: o.estimatedNotional != null ? String(o.estimatedNotional) : null,
            createdAt: o.createdAt.toISOString(),
          }))}
          events={events.map((e) => ({
            id: e.id,
            kind: e.kind,
            message: e.message,
            scoreBefore: e.scoreBefore,
            scoreAfter: e.scoreAfter,
            createdAt: e.createdAt.toISOString(),
            meta: (e.meta as Record<string, unknown> | null) ?? null,
          }))}
        />
      </AppShell>
    </>
  );
}
