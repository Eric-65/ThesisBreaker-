"use client";

import { ChevronDown, History, LogOut, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { useMe } from "./useMe";

const ITEMS = [
  { href: "/invites", label: "My invites", icon: Users },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AccountMenu() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!me?.authEnabled) return null;

  if (!me.signedIn) {
    return (
      <div className="flex items-center gap-1 sm:ml-1 sm:gap-2">
        <Link href="/signin" className="rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:text-ink sm:px-3">
          Sign in
          <span aria-hidden className="mt-0.5 block h-px" />
        </Link>
        <Link href="/signin?mode=signup" className="btn btn-primary hidden !px-3 !py-1.5 text-sm sm:inline-flex">
          Sign up
        </Link>
      </div>
    );
  }

  const label = me.name ?? me.email ?? "Account";
  return (
    <div ref={root} className="relative sm:ml-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${label}`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 text-muted transition-colors hover:text-ink"
      >
        <Avatar name={label} image={me.image} size={30} />
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 top-full z-50 mt-2 w-56 !bg-surface p-1.5 text-sm">
          <p className="truncate px-3 pb-2 pt-1.5 text-xs text-muted" title={me.email ?? undefined}>
            {me.email ?? label}
          </p>
          {ITEMS.map(({ href, label: text, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-ink/90 hover:bg-white/5 hover:text-ink"
            >
              <Icon className="h-4 w-4 text-muted" aria-hidden /> {text}
            </Link>
          ))}
          <form action={signOutAction} className="mt-1 border-t border-line pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-ink/90 hover:bg-white/5 hover:text-ink"
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
