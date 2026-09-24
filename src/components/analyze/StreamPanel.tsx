"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";

const MAX_TAIL = 1400;

/**
 * Typewriter view of the streamed model output. Characters are revealed at a
 * rate proportional to the backlog, so bursts from the network read smoothly.
 */
export function StreamPanel({
  streamRef,
  tick,
  running,
}: {
  streamRef: RefObject<{ reasoning: string; content: string }>;
  tick: number;
  running: boolean;
}) {
  const reduce = useReducedMotion();
  const [view, setView] = useState({ text: "", hasReasoning: false });
  const shownRef = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (tick === 0) shownRef.current = 0;
    if (frame.current !== null) return;
    const step = () => {
      const s = streamRef.current;
      const full = s.reasoning ? `${s.reasoning}\n\n${s.content}` : s.content;
      if (shownRef.current >= full.length) {
        frame.current = null;
        return;
      }
      const backlog = full.length - shownRef.current;
      shownRef.current = reduce ? full.length : Math.min(full.length, shownRef.current + Math.max(2, Math.ceil(backlog / 18)));
      const text = full.slice(0, shownRef.current);
      setView({
        text: text.length > MAX_TAIL ? `…${text.slice(-MAX_TAIL)}` : text,
        hasReasoning: Boolean(s.reasoning),
      });
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [tick, reduce, streamRef]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const text = tick === 0 ? "" : view.text;

  return (
    <div className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-xl border border-line bg-[#070a0e]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="num text-[11px] uppercase tracking-wider text-muted">
          {view.hasReasoning ? "Qwen reasoning + output" : "Qwen output stream"}
        </span>
        {running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" aria-hidden />}
      </div>
      {/* Anchored to the bottom so the newest tokens stay in view. */}
      <div className="flex max-h-[320px] flex-1 flex-col justify-end overflow-hidden">
        <pre className="num whitespace-pre-wrap break-words p-3 text-[11.5px] leading-relaxed text-cyan/80">
          {text || (running ? "Waiting for the model…" : "No model output (offline heuristic).")}
          {running && <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-cyan" aria-hidden />}
        </pre>
      </div>
    </div>
  );
}
