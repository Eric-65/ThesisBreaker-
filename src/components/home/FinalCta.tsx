import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal, RevealItem } from "@/components/ui/Reveal";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <RevealItem className="glass relative overflow-hidden p-8 text-center sm:p-12">
          <div aria-hidden className="trace absolute inset-x-0 top-0" />
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="metal-text">Which of your assumptions</span> <span className="text-cyan">is false right now?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Find out before you size the trade. AI analyzes; you decide.
          </p>
          <Link href="/analyze" className="btn btn-primary mt-8">
            Stress-test a trade <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </RevealItem>
      </Reveal>
    </section>
  );
}
