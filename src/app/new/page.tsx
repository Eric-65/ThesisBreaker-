import { Suspense } from "react";
import { BackgroundFx } from "@/components/BackgroundFx";
import { AppShell } from "@/components/AppShell";
import { NewThesisWorkflow } from "@/components/thesis/NewThesisWorkflow";

export default function NewThesisPage() {
  return (
    <>
      <BackgroundFx />
      <AppShell>
        <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
          <div className="mb-8">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
              New Thesis
            </div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Build a Thesis.
            </h1>
            <p className="mt-2 max-w-xl text-[#9aa1ae]">
              Tell us what you believe. We&rsquo;ll try to prove you wrong.
            </p>
          </div>
          <Suspense fallback={<div className="text-sm text-[#5e6472]">Loading workspace…</div>}>
            <NewThesisWorkflow />
          </Suspense>
        </div>
      </AppShell>
    </>
  );
}
