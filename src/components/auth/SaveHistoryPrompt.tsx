"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMe } from "./useMe";

const DISMISS_KEY = "tb_save_prompt_dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Non-blocking nudge shown after a completed, saved analysis when the visitor is not signed in. */
export function SaveHistoryPrompt({ show }: { show: boolean }) {
  const me = useMe();
  const [dismissed, setDismissed] = useState(false);

  // `show` only turns true after a client-side analysis, so localStorage is safe to read here.
  if (!show || dismissed || !me?.authEnabled || me.signedIn || wasDismissed()) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage blocked — dismiss for this page view only
    }
  };

  return (
    <aside
      role="status"
      aria-label="Save your history"
      className="glass fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Save your history, sign in.</p>
        <p className="mt-1 text-xs text-muted">
          This stress test is saved to this browser. Sign in to keep it, and every future one, on any device.
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/signin?next=/history" className="btn btn-primary !px-3 !py-1.5 text-sm">
            Sign in
          </Link>
          <button type="button" onClick={dismiss} className="btn btn-ghost !px-3 !py-1.5 text-sm">
            Not now
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-muted hover:text-ink">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </aside>
  );
}
