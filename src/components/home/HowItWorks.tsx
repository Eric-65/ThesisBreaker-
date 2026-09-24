import { MessageSquareText, ScanSearch, Gavel } from "lucide-react";
import { Reveal, RevealItem } from "@/components/ui/Reveal";

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Type the idea",
    body: "Plain English, the way you'd say it: “Long NVDA rToken over the weekend because earnings will beat.”",
  },
  {
    icon: ScanSearch,
    title: "Surface the assumptions",
    body: "Qwen extracts 4–8 testable assumptions — fundamental, technical, timing, liquidity, macro, sentiment — and checks each against live Bitget prices.",
  },
  {
    icon: Gavel,
    title: "Get a verdict",
    body: "PASS, REVISE or BLOCK, the single weakest assumption, and what would have to be true for the trade to work. You decide.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-20 sm:px-6">
      <Reveal>
        <RevealItem>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Three steps from conviction to <span className="text-cyan">evidence</span>.
          </h2>
        </RevealItem>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <RevealItem as="li" key={s.title} className="glass glass-hover h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-cyan">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="num text-sm text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </RevealItem>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
