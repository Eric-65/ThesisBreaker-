import type { NextRequest } from "next/server";
import { handlers, isAuthEnabled } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const disabled = () => Response.json({ error: "Sign-in is not configured on this server." }, { status: 404 });

export function GET(req: NextRequest) {
  return isAuthEnabled() ? handlers.GET(req) : disabled();
}

export function POST(req: NextRequest) {
  return isAuthEnabled() ? handlers.POST(req) : disabled();
}
