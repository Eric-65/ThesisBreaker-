"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import backdrop from "../../../public/images/circuit-backdrop.webp";
import { MetalCubes } from "./MetalCubes";

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Image
        src={backdrop}
        alt=""
        priority
        placeholder="blur"
        fill
        sizes="100vw"
        className="-z-10 object-cover opacity-45 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pb-24 md:pt-20">
        <div>
          <motion.p className="eyebrow" variants={rise} initial="hidden" animate="show" custom={0}>
            AI Trading Desk · Decision stress testing
          </motion.p>
          <motion.h1
            className="mt-4 text-balance text-[2.35rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={1}
          >
            <span className="metal-text">Break your thesis</span>{" "}
            <span className="text-ink">before the market does.</span>
          </motion.h1>
          <motion.p
            className="mt-5 max-w-xl text-pretty text-base text-muted sm:text-lg"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={2}
          >
            A pre-trade red team for tokenized U.S. stocks — 24/7. Other tools tell you what happened in similar setups.
            ThesisBreaker tells you which of <em className="not-italic text-ink">your</em> assumptions is false right now.
          </motion.p>
          <motion.div className="mt-8 flex flex-wrap gap-3" variants={rise} initial="hidden" animate="show" custom={3}>
            <Link href="/analyze" className="btn btn-primary">
              Stress-test a trade <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="#how" className="btn btn-ghost">
              How it works
            </Link>
          </motion.div>
          <motion.dl
            className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6 text-xs text-muted"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={4}
          >
            {[
              ["4–8", "assumptions tested"],
              ["3", "possible verdicts"],
              ["24/7", "rToken markets"],
            ].map(([k, v]) => (
              <div key={v}>
                <dt className="sr-only">{v}</dt>
                <dd className="num text-xl text-ink">{k}</dd>
                <dd className="mt-1">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
          <MetalCubes />
        </motion.div>
      </div>
    </section>
  );
}
