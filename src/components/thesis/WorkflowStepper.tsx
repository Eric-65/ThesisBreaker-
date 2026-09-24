"use client";

import { CheckCircle2 } from "lucide-react";

export type WorkflowStage = "thesis" | "challenge" | "evidence" | "verdict" | "paper" | "monitor";

const STAGES: { key: WorkflowStage; label: string }[] = [
  { key: "thesis", label: "Thesis" },
  { key: "challenge", label: "Challenge" },
  { key: "evidence", label: "Evidence" },
  { key: "verdict", label: "Verdict" },
  { key: "paper", label: "Paper Trade" },
  { key: "monitor", label: "Monitor" },
];

export function WorkflowStepper({ current }: { current: WorkflowStage }) {
  const currentIdx = STAGES.findIndex((s) => s.key === current);
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex min-w-[560px] items-center gap-2">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  done
                    ? "border-[#166534] bg-[#062513] text-[#86efac]"
                    : active
                      ? "border-[#7f1d1d] bg-[#210a0a] text-[#fca5a5]"
                      : "border-[#1e222c] bg-[#0a0c11] text-[#5e6472]"
                }`}
              >
                <span className="tabular text-[10px] tracking-widest opacity-70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {done ? <CheckCircle2 size={12} /> : null}
                {s.label}
              </div>
              {i < STAGES.length - 1 && (
                <span
                  className={`h-px w-6 ${
                    i < currentIdx ? "bg-[#166534]" : "bg-[#1e222c]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
