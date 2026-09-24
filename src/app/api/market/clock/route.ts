import { alpacaClock } from "@/lib/market/providers/alpacaStock";

export const dynamic = "force-dynamic";

export async function GET() {
  const clock = await alpacaClock();
  if (!clock) {
    return Response.json({
      ok: true,
      data: { isOpen: false, session: "UNAVAILABLE", source: "unavailable" },
    });
  }
  const now = new Date(clock.timestamp);
  // Rough session inference for pre/after using next_open/next_close windows
  const session = clock.is_open ? "OPEN" : "CLOSED";
  return Response.json({
    ok: true,
    data: {
      isOpen: clock.is_open,
      session,
      timestamp: now.toISOString(),
      nextOpen: clock.next_open,
      nextClose: clock.next_close,
      source: "ALPACA",
    },
  });
}
