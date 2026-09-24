import { ShieldAlert } from "lucide-react";

/** Persistent on every page. */
export function DisclaimerBar() {
  return (
    <div
      role="note"
      className="border-b border-line bg-[#070a0e]/95"
    >
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-[11px] tracking-wide text-muted">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-revise" aria-hidden />
        <span>
          <strong className="font-semibold text-ink">Not financial advice</strong> · research tool<span className="hidden sm:inline"> · AI analyzes, you decide</span>
        </span>
      </p>
    </div>
  );
}
