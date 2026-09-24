"use client";

import { useEffect, useState } from "react";

/** Tiny cross-component agent-status store. Used by the top-bar badge so any
 * feature can push a status ("ANALYZING", "MONITORING", ...) without prop
 * drilling or adding zustand. */

export type AgentStatus =
  | "IDLE"
  | "ANALYZING"
  | "CHALLENGING"
  | "RESEARCHING"
  | "VALIDATING"
  | "RISK CHECKING"
  | "MONITORING"
  | "READY";

let current: AgentStatus = "IDLE";
const listeners = new Set<(s: AgentStatus) => void>();

export function setAgentStatus(s: AgentStatus) {
  current = s;
  for (const l of listeners) l(s);
}

export function useAgentStatus(): AgentStatus {
  const [state, setState] = useState<AgentStatus>(current);
  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}

// stub to satisfy re-exports
export const create = () => undefined;
