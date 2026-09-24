"use client";

import { useCallback, useRef, useState } from "react";
import type { MarketSnapshot, StepId, StreamEvent, StressTestResult } from "@/lib/analysis/types";

export type StepState = { status: "pending" | "active" | "done" | "skipped" | "failed"; detail?: string };
export type Phase = "idle" | "running" | "done" | "error";

const STEP_ORDER: StepId[] = ["parse", "cache", "market", "extract", "score", "save"];

function initialSteps(): Record<StepId, StepState> {
  return Object.fromEntries(STEP_ORDER.map((s) => [s, { status: "pending" }])) as Record<StepId, StepState>;
}

/** POSTs the idea and consumes the SSE stream from /api/analyze. */
export function useStressTest() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState(initialSteps);
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef({ reasoning: "", content: "" });
  const [streamTick, setStreamTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const handle = useCallback((e: StreamEvent) => {
    switch (e.type) {
      case "step":
        setSteps((s) => ({ ...s, [e.id]: { status: e.status, detail: e.detail } }));
        break;
      case "market":
        setMarket(e.market);
        break;
      case "delta":
        streamRef.current[e.channel] += e.text;
        setStreamTick((t) => t + 1);
        break;
      case "assumption":
        setFound((f) => [...f, e.text]);
        break;
      case "result":
        setResult(e.result);
        setPhase("done");
        break;
      case "error":
        setError(e.message);
        setPhase("error");
        break;
    }
  }, []);

  const run = useCallback(
    async (idea: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPhase("running");
      setSteps(initialSteps());
      setMarket(null);
      setFound([]);
      setResult(null);
      setError(null);
      streamRef.current = { reasoning: "", content: "" };
      setStreamTick(0);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idea }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let gotResult = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const event = JSON.parse(line.slice(5).trim()) as StreamEvent;
            if (event.type === "result" || event.type === "error") gotResult = true;
            handle(event);
          }
        }
        if (!gotResult) throw new Error("The analysis stream ended early. Please try again.");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setPhase("error");
      }
    },
    [handle],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setResult(null);
    setError(null);
  }, []);

  return { phase, steps, stepOrder: STEP_ORDER, market, found, result, error, streamRef, streamTick, run, reset };
}
