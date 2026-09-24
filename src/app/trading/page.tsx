import { AppShell } from "@/components/AppShell";
import { BackgroundFx } from "@/components/BackgroundFx";
import { PaperTradingClient } from "@/components/trading/PaperTradingClient";

export default function PaperTradingPage() {
  return (
    <>
      <BackgroundFx />
      <AppShell>
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="mb-8">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
              Alpaca Paper
            </div>
            <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
              Paper Trading
            </h1>
            <p className="mt-2 text-[#9aa1ae]">
              Simulated portfolio. No real capital, no live orders.
            </p>
          </div>
          <PaperTradingClient />
        </div>
      </AppShell>
    </>
  );
}
