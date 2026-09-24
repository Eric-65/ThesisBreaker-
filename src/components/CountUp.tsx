"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function CountUp({
  to,
  duration = 1.6,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  to: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20, duration });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (inView) {
      mv.set(to);
      const unsub = spring.on("change", (v) => setVal(v));
      return () => unsub();
    }
  }, [inView, to, mv, spring]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}
