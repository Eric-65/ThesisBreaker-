import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import type { AssumptionStatus, Verdict } from "@/lib/analysis/types";
import { STATUS_META, VERDICT_META } from "./meta";

const STATUS_ICON = { holds: CircleCheck, weak: CircleAlert, broken: CircleX } as const;
const VERDICT_ICON = { PASS: CircleCheck, REVISE: CircleAlert, BLOCK: CircleX } as const;

/** Status is always icon + label, never color alone. */
export function StatusBadge({ status }: { status: AssumptionStatus }) {
  const m = STATUS_META[status];
  const Icon = STATUS_ICON[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-current/25 px-2 py-0.5 text-xs font-medium ${m.text}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

export function VerdictBadge({ verdict, size = "sm" }: { verdict: Verdict; size?: "sm" | "md" }) {
  const m = VERDICT_META[verdict];
  const Icon = VERDICT_ICON[verdict];
  return (
    <span
      className={`num inline-flex items-center gap-1.5 rounded-md border border-current/30 bg-current/[0.08] font-semibold tracking-wider ${m.text} ${
        size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
      {m.label}
    </span>
  );
}
