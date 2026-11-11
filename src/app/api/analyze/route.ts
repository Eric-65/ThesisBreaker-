import { z } from "zod";
import { MAX_IDEA_CHARS, runStressTest } from "@/lib/analysis/run";
import type { StreamEvent } from "@/lib/analysis/types";
import { isDbConfigured } from "@/db";
import { rateLimit, recentAnalysesCount } from "@/lib/rateLimit";
import { currentIdentity, hashedClientIp } from "@/lib/visitor/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Body = z.object({ idea: z.string().trim().min(8).max(MAX_IDEA_CHARS) });

const PER_VISITOR_PER_MINUTE = 6;
const PER_IP_PER_MINUTE = 20; // a shared NAT can hold several visitors
const PER_VISITOR_PER_HOUR = 30;

function tooMany(retryAfterS: number, message = "Too many analyses — try again shortly.") {
  return Response.json({ error: message }, { status: 429, headers: { "retry-after": String(retryAfterS) } });
}

/** POST { idea } → text/event-stream of StreamEvent JSON frames. */
export async function POST(req: Request) {
  // Backstop against clients that drop cookies: keyed on a salted IP hash, never the raw IP.
  const byIp = rateLimit(`analyze:ip:${hashedClientIp(req.headers)}`, PER_IP_PER_MINUTE, 60_000);
  if (!byIp.ok) return tooMany(byIp.retryAfterS);

  let userId: string | null = null;
  try {
    userId = (await currentIdentity()).userId;
  } catch (err) {
    console.error("[analyze] identity lookup failed:", (err as Error).message);
  }

  if (userId) {
    const byVisitor = rateLimit(`analyze:user:${userId}`, PER_VISITOR_PER_MINUTE, 60_000);
    if (!byVisitor.ok) return tooMany(byVisitor.retryAfterS);
    if (isDbConfigured()) {
      const lastHour = await recentAnalysesCount(userId, 3_600_000).catch(() => 0);
      if (lastHour >= PER_VISITOR_PER_HOUR) {
        return tooMany(15 * 60, `Hourly limit reached (${PER_VISITOR_PER_HOUR} stress tests). Try again later.`);
      }
    }
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
        await runStressTest(parsed.data.idea, emit, req.signal, { userId });
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
