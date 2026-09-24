"use client";

import { setAgentStatus, useAgentStatus } from "./agentStore";

const COLOR: Record<string, string> = {
  IDLE: "#5e6472",
  ANALYZING: "#f5b400",
  CHALLENGING: "#ef4444",
  RESEARCHING: "#38bdf8",
  VALIDATING: "#f5b400",
  "RISK CHECKING": "#f5b400",
  MONITORING: "#22c55e",
  READY: "#22c55e",
};

export function AgentStatusBadge() {
  const status = useAgentStatus();
  const color = COLOR[status] ?? "#9aa1ae";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1e222c] bg-[#0a0c11] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">
      <span className="relative flex h-1.5 w-1.5">
        {status !== "IDLE" && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: color }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
      </span>
      <span style={{ color }}>Agent · {status}</span>
    </span>
  );
}

export { setAgentStatus, useAgentStatus };
