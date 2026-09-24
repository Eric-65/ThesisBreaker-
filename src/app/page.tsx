import { BackgroundFx } from "@/components/BackgroundFx";
import { SiteHeader } from "@/components/SiteHeader";
import { TickerMarquee } from "@/components/TickerMarquee";
import { Hero } from "@/components/landing/Hero";
import { MiniDemo } from "@/components/landing/MiniDemo";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProveMeWrong } from "@/components/landing/ProveMeWrong";
import { ScoreSection } from "@/components/landing/ScoreSection";
import { PaperFlow } from "@/components/landing/PaperFlow";
import { Monitoring } from "@/components/landing/Monitoring";
import { FinalCTA } from "@/components/landing/FinalCTA";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <BackgroundFx />
      <SiteHeader />
      <TickerMarquee />
      <Hero />
      <MiniDemo />
      <HowItWorks />
      <ProveMeWrong />
      <ScoreSection />
      <PaperFlow />
      <Monitoring />
      <FinalCTA />
      <footer className="border-t border-[#12141b]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-[#5e6472] md:flex-row md:px-8">
          <div>© 2026 ThesisBreaker · Paper trading only. Not financial advice.</div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link href="/new" className="hover:text-white">New Thesis</Link>
            <Link href="/settings" className="hover:text-white">Alpaca</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
