import { NextRequest } from "next/server";
import { search } from "@/lib/market/router";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await search(q);
  return Response.json({ ok: true, data: results });
}
