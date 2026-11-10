import { getPublicStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → { users, analyses, returningUsers }. Aggregate only; cached 60 s in the data cache and at the CDN. */
export async function GET() {
  const stats = await getPublicStats();
  if (!stats) {
    return Response.json({ error: "Stats unavailable." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  return Response.json(stats, {
    headers: { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  });
}
