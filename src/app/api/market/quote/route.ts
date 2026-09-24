import { NextRequest } from "next/server";
import { getQuote, resolveIdentity } from "@/lib/market/router";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const assetType = req.nextUrl.searchParams.get("assetType");
  if (!symbol) return Response.json({ ok: false, error: "symbol required" }, { status: 400 });

  let identity = resolveIdentity(symbol);

  // Allow the client to specify assetType explicitly so unknown-but-typed
  // crypto or NFT slugs still work.
  if (!identity && assetType === "CRYPTO") {
    const sym = symbol.toUpperCase().replace(/[^A-Z0-9/]/g, "");
    identity = {
      symbol: sym.includes("/") ? sym : `${sym}/USDT`,
      displayName: sym,
      assetType: "CRYPTO",
      currency: "USDT",
      tradableThroughAlpaca: false,
      binancePair: (sym.replace("/", "").endsWith("USDT")
        ? sym.replace("/", "")
        : `${sym.replace("/", "")}USDT`) as string,
    };
  } else if (!identity && assetType === "STOCK") {
    identity = {
      symbol: symbol.toUpperCase(),
      displayName: symbol.toUpperCase(),
      assetType: "STOCK",
      currency: "USD",
      tradableThroughAlpaca: true,
    };
  } else if (!identity && assetType === "NFT_COLLECTION") {
    identity = {
      symbol: symbol.toLowerCase(),
      displayName: symbol,
      assetType: "NFT_COLLECTION",
      currency: "ETH",
      tradableThroughAlpaca: false,
      openSeaSlug: symbol.toLowerCase(),
    };
  }

  if (!identity) {
    return Response.json({ ok: false, error: "Unknown symbol" }, { status: 404 });
  }

  const quote = await getQuote(identity);
  return Response.json({ ok: true, data: { identity, quote } });
}
