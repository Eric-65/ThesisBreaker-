import { NextRequest } from "next/server";
import { extractThesis } from "@/lib/agents/pipeline";
import type { Direction } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/theses/extract
 *
 * Runs only the ThesisExtractor and returns the structured extraction so
 * the user can review/edit assumptions BEFORE the red-team runs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbolRaw = String(body?.symbol ?? "").trim();
    const originalText = String(body?.originalText ?? "").trim();
    if (!symbolRaw || !originalText) {
      return Response.json({ ok: false, error: "symbol and originalText required" }, { status: 400 });
    }
    const direction: Direction = body?.direction === "short" ? "short" : "long";
    const rawAssetType = String(body?.assetType ?? "STOCK").toUpperCase();
    const assetType = (["STOCK", "ETF", "CRYPTO", "NFT_COLLECTION"].includes(rawAssetType)
      ? rawAssetType
      : "STOCK") as "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";
    const symbol = assetType === "NFT_COLLECTION" ? symbolRaw.toLowerCase() : symbolRaw.toUpperCase();
    const extraction = extractThesis({
      symbol,
      direction,
      timeHorizon: String(body?.timeHorizon ?? "3-6M"),
      originalText,
      catalysts: body?.catalysts ? String(body.catalysts) : undefined,
      expectedOutcome: body?.expectedOutcome ? String(body.expectedOutcome) : undefined,
      assetType,
    });
    return Response.json({ ok: true, data: extraction });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
