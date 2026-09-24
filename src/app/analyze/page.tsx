import type { Metadata } from "next";
import { Suspense } from "react";
import { Workbench } from "@/components/analyze/Workbench";

export const metadata: Metadata = {
  title: "Analyze",
  description: "Stress-test a trade idea: extract its assumptions, test them against evidence, get PASS / REVISE / BLOCK.",
};

export default function AnalyzePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">Workbench</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="metal-text">Stress-test</span> a trade idea
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        ThesisBreaker extracts the assumptions your idea depends on, checks each against live Bitget prices, and tells you
        which one is most likely to break.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="glass h-64 animate-pulse" />}>
          <Workbench />
        </Suspense>
      </div>
    </div>
  );
}
