import Link from "next/link";
import { desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { BackgroundFx } from "@/components/BackgroundFx";
import { db } from "@/db";
import { theses } from "@/db/schema";
import { HistoryClient } from "@/components/history/HistoryClient";
import type { AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  let items: {
    id: string;
    symbol: string;
    direction: string;
    initialScore: number;
    currentScore: number;
    status: string;
    verdict: string;
    createdAt: string;
    originalText: string;
  }[] = [];
  try {
    const rows = await db.select().from(theses).orderBy(desc(theses.createdAt)).limit(100);
    items = rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      direction: r.direction,
      initialScore: r.initialScore,
      currentScore: r.currentScore,
      status: r.status,
      verdict: (r.analysis as AnalysisResult).verdict.status,
      createdAt: r.createdAt.toISOString(),
      originalText: r.originalText,
    }));
  } catch {
    items = [];
  }

  return (
    <>
      <BackgroundFx />
      <AppShell>
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
                Timeline
              </div>
              <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
                Thesis History
              </h1>
            </div>
            <Link href="/new" className="btn btn-primary">
              Break a New Thesis →
            </Link>
          </div>
          <HistoryClient items={items} />
        </div>
      </AppShell>
    </>
  );
}
