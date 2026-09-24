import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BackgroundFx } from "@/components/BackgroundFx";
import { MarketClient } from "@/components/market/MarketClient";

export default function MarketPage() {
  return (
    <>
      <BackgroundFx />
      <AppShell>
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5e6472]">
                Research
              </div>
              <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
                Market
              </h1>
              <p className="mt-2 text-[#9aa1ae]">
                Scan the tape. Find the idea. Test it before you trade it.
              </p>
            </div>
            <Link href="/new" className="btn btn-primary">
              Build Thesis
            </Link>
          </div>
          <MarketClient />
        </div>
      </AppShell>
    </>
  );
}
