"use client";

import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  score: number; // 0-100
  size?: number;
  label?: string;
  animate?: boolean;
}

export function ScoreRing({ score, size = 220, label, animate = true }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const target = Math.max(0, Math.min(100, score));
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);
  const strokeDashoffset = useTransform(spring, (v) => {
    const circumference = 2 * Math.PI * ((size - 24) / 2);
    return circumference - (v / 100) * circumference;
  });

  useEffect(() => {
    if (!animate) {
      mv.set(target);
      setDisplay(target);
      return;
    }
    if (inView) {
      mv.set(target);
      const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
      return () => unsub();
    }
  }, [inView, target, mv, spring, animate]);

  const color = target >= 80 ? "#22c55e" : target >= 55 ? "#f5b400" : "#ef4444";
  const circumference = 2 * Math.PI * ((size - 24) / 2);
  const stroke = 10;

  return (
    <div ref={ref} className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="ring-track" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#1a1e28" />
            <stop offset="1" stopColor="#0b0d12" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 24) / 2}
          fill="none"
          stroke="url(#ring-track)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 24) / 2}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
          filter="drop-shadow(0 0 12px rgba(255,255,255,0.06))"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-semibold tabular text-white">
          {display}
          <span className="text-2xl text-[#5e6472]">/100</span>
        </div>
        {label && (
          <div
            className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
