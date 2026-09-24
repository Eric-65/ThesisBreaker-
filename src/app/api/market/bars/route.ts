import { NextRequest } from "next/server";
import { getBars, resolveIdentity } from "@/lib/market/router";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  const windowStr = (req.nextUrl.searchParams.get("window") ?? "30D") as "30D" | "7D" | "1D";
  const assetType = req.nextUrl.searchParams.get("assetType");
  if (!symbol) return Response.json({ ok: false, error: "symbol required" }, { status: 400 });
  let identity = resolveIdentity(symbol);
  if (!identity && assetType === "CRYPTO") {
    const sym = symbol.toUpperCase().replace(/[^A-Z0-9/]/g, "");
    identity = {
      symbol: sym.includes("/") ? sym : `${sym}/USDT`,
      displayName: sym,
      assetType: "CRYPTO",
      currency: "USDT",
      tradableThroughAlpaca: false,
      binancePair: sym.replace("/", "").endsWith("USDT")
        ? sym.replace("/", "")
        : `${sym.replace("/", "")}USDT`,
    };
  } else if (!identity && assetType === "STOCK") {
    identity = {
      symbol: symbol.toUpperCase(),
      displayName: symbol.toUpperCase(),
      assetType: "STOCK",
      currency: "USD",
      tradableThroughAlpaca: true,
    };
  }
  if (!identity) return Response.json({ ok: false, error: "Unknown symbol" }, { status: 404 });
  const bars = await getBars(identity, windowStr);
  if (!bars) return Response.json({ ok: true, data: null });
  return Response.json({ ok: true, data: bars });
}
