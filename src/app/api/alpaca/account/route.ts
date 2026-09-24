import { alpaca, demoAlpaca, isAlpacaConfigured } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAlpacaConfigured()) {
    return Response.json({ ok: true, mode: "demo", data: demoAlpaca.account() });
  }
  try {
    const data = await alpaca.getAccount();
    return Response.json({ ok: true, mode: "live", data });
  } catch (err) {
    return Response.json(
      { ok: false, mode: "demo", data: demoAlpaca.account(), error: (err as Error).message },
      { status: 200 },
    );
  }
}
