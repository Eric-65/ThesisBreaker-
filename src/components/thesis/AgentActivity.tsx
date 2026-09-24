"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Cpu } from "lucide-react";

export interface AgentTask {
  label: string;
  detail?: string;
}

/**
 * AgentActivity panel — shows the agent working through a sequence of tasks.
 * Completed tasks are checkmarks; the current task shows an animated
 * indicator. Reused for both the "breaking your thesis" modal and the
 * "agent history" card on the workspace.
 */
export function AgentActivity({
  tasks,
  currentIndex,
  compact = false,
  title = "ThesisBreaker Agent",
  status,
}: {
  tasks: AgentTask[];
  currentIndex: number; // index of currently-running task; -1 or >=tasks.length means all done
  compact?: boolean;
  title?: string;
  status?: string;
}) {
  return (
    <div className={compact ? "" : "surface p-5"}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#1e222c] bg-[#0b0d12] text-[#ef4444]">
          <Cpu size={12} />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9aa1ae]">
          {title}
        </div>
        {status && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#1e222c] bg-[#0a0c11] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#f5b400]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f5b400] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#f5b400]" />
            </span>
            {status}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {tasks.map((t, i) => {
          const done = currentIndex < 0 || i < currentIndex;
          const active = i === currentIndex;
          return (
            <motion.li
              key={t.label}
              className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs transition ${
                active
                  ? "border-[#7f1d1d] bg-[#1a0808]/70"
                  : done
                    ? "border-[#0f2417] bg-[#062513]/40"
                    : "border-[#1e222c] bg-[#0a0c11] opacity-50"
              }`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: done || active ? 1 : 0.5, x: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                  done
                    ? "border-[#166534] bg-[#0a2f19] text-[#86efac]"
                    : active
                      ? "border-[#7f1d1d] bg-[#210a0a] text-[#fca5a5]"
                      : "border-[#1e222c] text-[#5e6472]"
                }`}
              >
                {done ? <CheckCircle2 size={10} /> : active ? "•" : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className={done ? "text-[#86efac]" : active ? "text-white" : "text-[#7a8091]"}>
                  {done ? `✓ ${t.label}` : active ? t.label : t.label}
                  {active && (
                    <span className="ml-1 dot-anim text-[#ef4444]">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
                {t.detail && (
                  <div className="mt-0.5 text-[10px] text-[#5e6472]">{t.detail}</div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
