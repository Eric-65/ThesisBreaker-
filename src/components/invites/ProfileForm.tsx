"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/actions/profile";

const INITIAL: ProfileState = { ok: false, message: "" };

/** Display name + community-wall opt-in. Off by default; nothing is public until the box is ticked. */
export function ProfileForm({
  displayName,
  showOnWall,
  suggestedName,
}: {
  displayName: string | null;
  showOnWall: boolean;
  suggestedName?: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, INITIAL);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="text-sm font-semibold">
          Display name
        </label>
        <p id="displayName-help" className="mt-1 text-xs text-muted">
          Up to 30 characters. Shown publicly only if you join the community wall. Your email is never shown.
        </p>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={30}
          autoComplete="nickname"
          aria-describedby="displayName-help"
          defaultValue={displayName ?? suggestedName?.slice(0, 30) ?? ""}
          placeholder="e.g. Rho Trader"
          className="mt-2 w-full rounded-xl border border-line bg-bg/70 px-4 py-2.5 text-[15px] text-ink placeholder:text-muted/60 focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="showOnWall"
          defaultChecked={showOnWall}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong bg-bg accent-cyan"
        />
        <span>
          <span className="font-medium text-ink">Show me on the community wall</span>
          <span className="mt-0.5 block text-xs text-muted">
            Your display name and profile photo appear in “Recently joined”, the inviters leaderboard, and to the person
            who invited you. Otherwise you are listed as “Anonymous trader”.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary !py-2 text-sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`flex items-center gap-1.5 text-sm ${state.ok ? "text-pass" : "text-block"}`}>
            {state.ok && <Check className="h-4 w-4" aria-hidden />}
            <span className="text-ink/90">{state.message}</span>
          </p>
        )}
      </div>
    </form>
  );
}
