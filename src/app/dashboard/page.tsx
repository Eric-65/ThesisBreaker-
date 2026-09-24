import Link from "next/link";
import { desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { BackgroundFx } from "@/components/BackgroundFx";
import { db } from "@/db";
import { monitoringEvents, theses } from "@/db/schema";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchTheses() {
  try {
    const rows = await db.select().from(theses).orderBy(desc(theses.createdAt)).limit(20);
    return rows;
  } catch {
    return [];
  }
}

async function fetchEvents() {
  try {
    const rows = await db
      .select()
      .from(monitoringEvents)
      .orderBy(desc(monitoringEvents.createdAt))
      .limit(12);
    return rows;
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [rows, eventsRaw] = await Promise.all([fetchTheses(), fetchEvents()]);
  const items = rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    direction: r.direction,
    status: r.status,
    initialScore: r.initialScore,
    currentScore: r.currentScore,
    createdAt: r.createdAt.toISOString(),
    verdict: (r.analysis as AnalysisResult).verdict.status,
  }));
  const symbolById = new Map<string, string>();
  for (const r of rows) symbolById.set(r.id, r.symbol);
  const events = eventsRaw.map((e) => ({
    id: e.id,
    kind: e.kind,
    message: e.message,
    scoreBefore: e.scoreBefore,
    scoreAfter: e.scoreAfter,
    thesisId: e.thesisId,
    symbol: symbolById.get(e.thesisId) ?? "",
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <>
      <BackgroundFx />
      <AppShell>
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
                Command Deck
              </div>
              <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
                Dashboard
              </h1>
            </div>
            <Link href="/new" className="btn btn-primary">
              Break a New Thesis →
            </Link>
          </div>
          <DashboardClient theses={items} events={events} />
        </div>
      </AppShell>
    </>
  );
}
