import { NextRequest } from "next/server";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(watchlist).orderBy(desc(watchlist.createdAt));
    return Response.json({ ok: true, data: rows });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbolRaw = String(body?.symbol ?? "").trim();
    const displayName = String(body?.displayName ?? symbolRaw).trim();
    const rawAssetType = String(body?.assetType ?? "STOCK").toUpperCase();
    const assetType = (["STOCK", "ETF", "CRYPTO", "NFT_COLLECTION"].includes(rawAssetType)
      ? rawAssetType
      : "STOCK") as "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";
    if (!symbolRaw) return Response.json({ ok: false, error: "symbol required" }, { status: 400 });
    const symbol = assetType === "NFT_COLLECTION" ? symbolRaw.toLowerCase() : symbolRaw.toUpperCase();
    // Idempotent upsert-style: if exists, return existing
    const existing = await db.select().from(watchlist).where(eq(watchlist.symbol, symbol)).limit(1);
    if (existing.length > 0) return Response.json({ ok: true, data: existing[0], duplicate: true });
    const [row] = await db
      .insert(watchlist)
      .values({ symbol, assetType, displayName })
      .returning();
    return Response.json({ ok: true, data: row });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const symbol = req.nextUrl.searchParams.get("symbol");
    if (!symbol) return Response.json({ ok: false, error: "symbol required" }, { status: 400 });
    await db.delete(watchlist).where(eq(watchlist.symbol, symbol));
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
