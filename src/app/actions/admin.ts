"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { endAdminSession, isAdmin, isAdminToken, startAdminSession } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";
import { hashedClientIp } from "@/lib/visitor/server";

export interface AdminLoginState {
  error: string;
}

export async function adminLogin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const limited = rateLimit(`admin-login:${hashedClientIp(await headers())}`, 5, 60_000);
  if (!limited.ok) return { error: `Too many attempts. Try again in ${limited.retryAfterS}s.` };
  if (!isAdminToken(String(formData.get("token") ?? ""))) return { error: "That token is not valid." };
  await startAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await endAdminSession();
  redirect("/admin");
}

/** Flag or unflag a user as internal (excluded from all public numbers). Admin only. */
export async function setUserInternal(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Not authorized");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Bad user id");
  await getDb()
    .update(users)
    .set({ isInternal: formData.get("internal") === "true" })
    .where(eq(users.id, id));
  revalidateTag("public-stats", "max");
  revalidatePath("/admin");
}
