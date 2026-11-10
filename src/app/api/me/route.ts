import { authProviders, isAuthEnabled } from "@/auth";
import { currentIdentity } from "@/lib/visitor/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Minimal client-side view of the current identity (no ids are exposed). */
export async function GET() {
  const authEnabled = isAuthEnabled();
  let signedIn = false;
  let email: string | null = null;
  let name: string | null = null;
  try {
    const me = await currentIdentity();
    signedIn = me.signedIn;
    email = me.email;
    name = me.name;
  } catch (err) {
    console.error("[me]", (err as Error).message);
  }
  return Response.json(
    { authEnabled, providers: authEnabled ? authProviders() : { google: false, email: false }, signedIn, email, name },
    { headers: { "cache-control": "private, no-store" } },
  );
}
