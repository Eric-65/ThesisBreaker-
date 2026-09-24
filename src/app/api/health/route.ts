import { sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { isQwenConfigured } from "@/lib/qwen";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = false;
  if (isDbConfigured()) {
    try {
      await getDb().execute(sql`select 1`);
      db = true;
    } catch {
      db = false;
    }
  }
  // Report only booleans — never configuration values.
  const qwen = isQwenConfigured();
  return Response.json({ ok: db, db, qwen, engine: qwen ? "qwen" : "offline" }, { status: db ? 200 : 503 });
}
