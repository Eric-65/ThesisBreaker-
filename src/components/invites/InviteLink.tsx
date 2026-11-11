"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useRef, useState } from "react";

const SHARE_TEXT = "I'm stress-testing trade ideas with ThesisBreaker. Try it:";

/** The invite link with Copy and Share (native share sheet where available, copy otherwise). */
export function InviteLink({ link }: { link: string }) {
  const [copied, setCopied] = useState<"link" | "share" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (what: "link" | "share") => {
    setCopied(what);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2200);
  };

  const copy = async (text: string, what: "link" | "share") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API blocked (e.g. insecure context): select the field so the user can copy by hand.
      input.current?.focus();
      input.current?.select();
      return;
    }
    flash(what);
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "ThesisBreaker", text: SHARE_TEXT, url: link });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // user closed the share sheet
      }
    }
    await copy(`${SHARE_TEXT} ${link}`, "share");
  };

  return (
    <div>
      <label htmlFor="invite-link" className="eyebrow">
        Your invite link
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="invite-link"
          ref={input}
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="num min-w-0 flex-1 rounded-xl border border-cyan/30 bg-bg/70 px-4 py-3 text-base text-ink focus:border-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyan/20 sm:text-lg"
        />
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1 justify-center sm:flex-none" onClick={() => void copy(link, "link")}>
            {copied === "link" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied === "link" ? "Copied" : "Copy"}
          </button>
          <button type="button" className="btn btn-ghost flex-1 justify-center sm:flex-none" onClick={() => void share()}>
            {copied === "share" ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
            {copied === "share" ? "Copied" : "Share"}
          </button>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied === "link" ? "Invite link copied" : copied === "share" ? "Share message copied" : ""}
      </p>
    </div>
  );
}
