import Link from "next/link";
import { desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { BackgroundFx } from "@/components/BackgroundFx";
import { db } from "@/db";
import { monitoringEvents, theses } from "@/db/schema";
import { AlertsClient } from "@/components/alerts/AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const [eventsRaw, thesisRows] = await Promise.all([
    db
      .select()
      .from(monitoringEvents)
      .orderBy(desc(monitoringEvents.createdAt))
      .limit(120)
      .catch(() => []),
    db.select().from(theses).orderBy(desc(theses.createdAt)).limit(200).catch(() => []),
  ]);
  const symbolById = new Map<string, string>();
  const assetTypeById = new Map<string, string>();
  for (const t of thesisRows) {
    symbolById.set(t.id, t.symbol);
    assetTypeById.set(t.id, t.assetType);
  }
  const events = eventsRaw.map((e) => ({
    id: e.id,
    thesisId: e.thesisId,
    symbol: symbolById.get(e.thesisId) ?? "",
    assetType: assetTypeById.get(e.thesisId) ?? "STOCK",
    kind: e.kind,
    message: e.message,
    scoreBefore: e.scoreBefore,
    scoreAfter: e.scoreAfter,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <>
      <BackgroundFx />
      <AppShell>
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
                Monitoring
              </div>
              <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
                Agent Alerts
              </h1>
              <p className="mt-2 max-w-xl text-[#9aa1ae]">
                Only meaningful changes are recorded here — score moves, weakened / strengthened
                assumptions, new contradictions, and paper-order lifecycle events.
              </p>
            </div>
            <Link href="/new" className="btn btn-primary">
              Break a New Thesis →
            </Link>
          </div>
          <AlertsClient events={events} />
        </div>
      </AppShell>
    </>
  );
}
