import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SampleVerdict } from "@/components/home/SampleVerdict";
import { TickerStrip } from "@/components/home/TickerStrip";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TickerStrip />
      <HowItWorks />
      <SampleVerdict />
      <FinalCta />
    </>
  );
}
