import { z } from "zod";
import { MAX_IDEA_CHARS, runStressTest } from "@/lib/analysis/run";
import type { StreamEvent } from "@/lib/analysis/types";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Body = z.object({ idea: z.string().trim().min(8).max(MAX_IDEA_CHARS) });

/** POST { idea } → text/event-stream of StreamEvent JSON frames. */
export async function POST(req: Request) {
  const limited = rateLimit(`analyze:${clientIp(req)}`, 12, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many analyses — try again shortly." },
      { status: 429, headers: { "retry-after": String(limited.retryAfterS) } },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: `Describe the trade idea in 8–${MAX_IDEA_CHARS} characters.` },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (e: StreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          open = false;
        }
      };
      try {
        await runStressTest(parsed.data.idea, emit, req.signal);
      } catch (err) {
        console.error("[analyze]", err);
        emit({ type: "error", message: "Analysis failed unexpectedly. Please try again." });
      } finally {
        open = false;
        try {
          controller.close();
        } catch {
          // client already gone
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
