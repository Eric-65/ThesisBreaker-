"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export interface ProfileState {
  ok: boolean;
  message: string;
}

// Letters and numbers in any script, plus a few separators. No @, /, : — so no emails or links on the wall.
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;

/** Signed-in only: set the public display name and whether to appear on the community wall. */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, message: "Sign in to change your profile." };

  const displayName = String(formData.get("displayName") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const showOnWall = formData.get("showOnWall") === "on";

  if (displayName.length > 30) return { ok: false, message: "Display name can be at most 30 characters." };
  if (displayName && (displayName.length < 2 || !NAME_RE.test(displayName))) {
    return { ok: false, message: "Use 2–30 letters, numbers, spaces or . _ ' - in your display name." };
  }
  if (showOnWall && !displayName) {
    return { ok: false, message: "Choose a display name to appear on the community wall." };
  }

  await getDb()
    .update(users)
    .set({ displayName: displayName || null, showOnWall })
    .where(eq(users.id, session.user.id));
  revalidatePath("/invites");
  revalidatePath("/profile");
  return {
    ok: true,
    message: showOnWall
      ? "Saved. You'll appear on the community page within a minute."
      : "Saved. You're not shown on the community page.",
  };
}
