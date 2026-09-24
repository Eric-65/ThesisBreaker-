import { isAlpacaConfigured } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    connected: isAlpacaConfigured(),
    environment: "PAPER",
  });
}
