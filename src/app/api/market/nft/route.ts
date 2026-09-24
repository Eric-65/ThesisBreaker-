import { NextRequest } from "next/server";
import { getNft, getNftHistory, resolveIdentity } from "@/lib/market/router";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return Response.json({ ok: false, error: "slug required" }, { status: 400 });
  const identity = resolveIdentity(slug) ?? {
    symbol: slug.toLowerCase(),
    displayName: slug,
    assetType: "NFT_COLLECTION" as const,
    currency: "ETH",
    tradableThroughAlpaca: false,
    openSeaSlug: slug.toLowerCase(),
  };
  const [stats, history] = await Promise.all([getNft(identity), getNftHistory(identity)]);
  return Response.json({ ok: true, data: { identity, stats, history } });
}
