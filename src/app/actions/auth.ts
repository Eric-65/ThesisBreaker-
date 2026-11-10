"use server";

import { z } from "zod";
import { isAuthEnabled, signIn, signOut } from "@/auth";

const safeRedirect = (v: FormDataEntryValue | null) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/history";

export async function signInWithGoogle(formData: FormData) {
  if (!isAuthEnabled()) return;
  await signIn("google", { redirectTo: safeRedirect(formData.get("next")) });
}

export async function signInWithEmail(formData: FormData) {
  if (!isAuthEnabled()) return;
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return;
  await signIn("resend", { email: email.data, redirectTo: safeRedirect(formData.get("next")) });
}

export async function signOutAction() {
  if (!isAuthEnabled()) return;
  await signOut({ redirectTo: "/" });
}
