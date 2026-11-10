"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { useMe } from "./useMe";

export function AccountMenu() {
  const me = useMe();
  if (!me?.authEnabled) return null;
  if (!me.signedIn) {
    return (
      <Link href="/signin" className="rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:text-ink sm:px-3">
        Sign in
        <span aria-hidden className="mt-0.5 block h-px" />
      </Link>
    );
  }
  return (
    <form action={signOutAction} className="flex items-center">
      <span className="hidden max-w-[12rem] truncate px-2 text-xs text-muted md:inline" title={me.email ?? undefined}>
        {me.email}
      </span>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">Sign out</span>
      </button>
    </form>
  );
}
