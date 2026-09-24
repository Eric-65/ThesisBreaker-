import { getStripQuotes } from "@/lib/market";
import { STRIP_UNDERLYINGS } from "@/lib/market/universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quotes for the landing-page strip. Only symbols verified against Bitget's live list are returned. */
export async function GET() {
  const quotes = await getStripQuotes(STRIP_UNDERLYINGS);
  return Response.json(
    { quotes, provider: "bitget-spot-v2", fetchedAt: new Date().toISOString() },
    { headers: { "cache-control": "public, max-age=10, stale-while-revalidate=30" } },
  );
}
