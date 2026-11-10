import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SampleVerdict } from "@/components/home/SampleVerdict";
import { TickerStrip } from "@/components/home/TickerStrip";
import { getPublicStats } from "@/lib/stats";

// Static page, regenerated at most once a minute so the counter stays fresh.
export const revalidate = 60;

export default async function LandingPage() {
  const stats = await getPublicStats();
  return (
    <>
      <Hero stats={stats} />
      <TickerStrip />
      <HowItWorks />
      <SampleVerdict />
      <FinalCta />
    </>
  );
}
