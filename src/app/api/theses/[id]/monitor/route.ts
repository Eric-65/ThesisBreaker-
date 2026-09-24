import { NextRequest } from "next/server";
import { reevaluateThesis } from "@/lib/monitor";

export const dynamic = "force-dynamic";

/**
 * POST /api/theses/[id]/monitor
 *
 * Re-runs the pipeline against the SAME original thesis text (never rewriting
 * the original) and logs any score/assumption changes as monitoring events.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const result = await reevaluateThesis(id);
    return Response.json({ ok: true, data: result });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
