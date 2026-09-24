"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * A bull vs bear editorial illustration built entirely from SVG.
 * - Red bear on the left (challenge / downside)
 * - Green bull on the right (opportunity / conviction)
 * - Animated market lines behind, subtle particles, candlestick strip below
 * - Subtle parallax to pointer on desktop
 */
export function HeroVisual() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 15 });
  const sy = useSpring(my, { stiffness: 60, damping: 15 });

  // Parallax translates (small)
  const bearX = useTransform(sx, [-1, 1], [8, -8]);
  const bearY = useTransform(sy, [-1, 1], [6, -6]);
  const bullX = useTransform(sx, [-1, 1], [-10, 10]);
  const bullY = useTransform(sy, [-1, 1], [-6, 6]);
  const gridX = useTransform(sx, [-1, 1], [4, -4]);
  const gridY = useTransform(sy, [-1, 1], [3, -3]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (isCoarse) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      const py = ((e.clientY - r.top) / r.height) * 2 - 1;
      mx.set(Math.max(-1, Math.min(1, px)));
      my.set(Math.max(-1, Math.min(1, py)));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <div ref={wrapRef} className="relative aspect-[5/4] w-full max-w-[620px]">
      {/* Faint grid + market lines background */}
      <motion.svg
        viewBox="0 0 600 480"
        className="absolute inset-0 h-full w-full"
        style={{ x: gridX, y: gridY }}
      >
        <defs>
          <linearGradient id="grid-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1a1e28" stopOpacity="0.6" />
            <stop offset="1" stopColor="#0b0d12" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="line-red" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ef4444" stopOpacity="0" />
            <stop offset="0.6" stopColor="#ef4444" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="line-green" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="0.5" stopColor="#22c55e" stopOpacity="0.7" />
            <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="glow-red" cx="0.3" cy="0.55" r="0.5">
            <stop offset="0" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-green" cx="0.7" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#22c55e" stopOpacity="0.35" />
            <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid */}
        <g stroke="url(#grid-fade)" strokeWidth="0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1="0" x2="600" y1={i * 40} y2={i * 40} />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} x2={i * 40} y1="0" y2="480" />
          ))}
        </g>

        {/* Radial glows */}
        <rect width="600" height="480" fill="url(#glow-red)" />
        <rect width="600" height="480" fill="url(#glow-green)" />

        {/* Animated market lines */}
        <motion.path
          d="M0 320 C 80 300, 140 340, 200 300 S 340 220, 420 240 S 560 200, 600 180"
          stroke="url(#line-green)"
          strokeWidth="1.6"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.2, delay: 0.4, ease: "easeInOut" }}
        />
        <motion.path
          d="M0 200 C 90 240, 160 200, 240 260 S 380 340, 460 320 S 560 300, 600 340"
          stroke="url(#line-red)"
          strokeWidth="1.6"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.2, delay: 0.7, ease: "easeInOut" }}
        />
        <motion.path
          d="M0 380 C 100 360, 200 400, 300 370 S 500 340, 600 360"
          stroke="#2a2f3c"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, delay: 0.2, ease: "easeInOut" }}
        />
      </motion.svg>

      {/* Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/40"
            style={{
              left: `${(i * 73) % 100}%`,
              top: `${(i * 37) % 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 6 + (i % 5),
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i % 7) * 0.4,
            }}
          />
        ))}
      </div>

      {/* Bear */}
      <motion.div
        className="absolute left-[2%] top-[18%] w-[52%]"
        style={{ x: bearX, y: bearY }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <BearSVG />
      </motion.div>

      {/* Bull */}
      <motion.div
        className="absolute right-[2%] top-[26%] w-[54%]"
        style={{ x: bullX, y: bullY }}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 1.05, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <BullSVG />
      </motion.div>

      {/* Central VS badge */}
      <motion.div
        className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#2a2f3c] bg-[#0b0d12] text-[11px] font-semibold tracking-widest text-[#9aa1ae] shadow-[0_0_60px_-10px_rgba(255,255,255,0.15)]">
          VS
        </div>
      </motion.div>

      {/* Candlestick strip */}
      <motion.div
        className="absolute bottom-0 left-0 right-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.7 }}
      >
        <CandlestickStrip />
      </motion.div>
    </div>
  );
}

function BearSVG() {
  // Stylized bear silhouette in red with descending arrow
  return (
    <svg viewBox="0 0 300 260" className="h-auto w-full">
      <defs>
        <linearGradient id="bear-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <filter id="bear-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#bear-glow)">
        {/* Body */}
        <path
          d="M40 170 C 40 120, 90 90, 150 95 C 210 100, 250 130, 260 170 C 265 195, 250 220, 220 225 L 80 225 C 55 220, 40 200, 40 170 Z"
          fill="url(#bear-fill)"
          opacity="0.9"
        />
        {/* Head */}
        <circle cx="90" cy="95" r="45" fill="url(#bear-fill)" />
        {/* Ears */}
        <circle cx="65" cy="60" r="14" fill="#7f1d1d" />
        <circle cx="115" cy="55" r="14" fill="#7f1d1d" />
        {/* Snout */}
        <ellipse cx="72" cy="108" rx="18" ry="12" fill="#450a0a" />
        {/* Eye */}
        <circle cx="98" cy="88" r="4" fill="#0b0d12" />
        {/* Legs */}
        <rect x="90" y="215" width="18" height="30" rx="4" fill="#7f1d1d" />
        <rect x="200" y="215" width="18" height="30" rx="4" fill="#7f1d1d" />
        {/* Claw / arrow down */}
        <path
          d="M235 60 L 235 130 M 220 115 L 235 130 L 250 115"
          stroke="#ef4444"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function BullSVG() {
  return (
    <svg viewBox="0 0 300 260" className="h-auto w-full">
      <defs>
        <linearGradient id="bull-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#166534" />
        </linearGradient>
        <filter id="bull-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#bull-glow)">
        {/* Body */}
        <path
          d="M40 170 C 40 130, 80 95, 150 90 C 220 85, 260 120, 265 165 C 268 195, 245 225, 210 225 L 80 225 C 55 220, 40 200, 40 170 Z"
          fill="url(#bull-fill)"
          opacity="0.9"
        />
        {/* Head */}
        <ellipse cx="220" cy="110" rx="46" ry="42" fill="url(#bull-fill)" />
        {/* Horns */}
        <path
          d="M195 72 C 175 45, 165 40, 155 55 C 170 65, 185 78, 195 82 Z"
          fill="#e7e9ee"
        />
        <path
          d="M248 72 C 268 45, 278 40, 288 55 C 273 65, 258 78, 248 82 Z"
          fill="#e7e9ee"
        />
        {/* Eye */}
        <circle cx="235" cy="105" r="4" fill="#0b0d12" />
        {/* Nose */}
        <ellipse cx="256" cy="125" rx="10" ry="6" fill="#065f46" />
        {/* Legs */}
        <rect x="80" y="215" width="18" height="30" rx="4" fill="#166534" />
        <rect x="190" y="215" width="18" height="30" rx="4" fill="#166534" />
        {/* Arrow up */}
        <path
          d="M60 130 L 60 60 M 45 75 L 60 60 L 75 75"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function CandlestickStrip() {
  const rng = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1;
  const bars = Array.from({ length: 42 }).map((_, i) => {
    const seed = Math.abs(rng(i));
    const up = seed > 0.45;
    const height = 12 + Math.floor(seed * 40);
    const wick = 6 + Math.floor(seed * 12);
    return { up, height, wick };
  });
  return (
    <svg viewBox="0 0 600 90" className="h-auto w-full opacity-90">
      {bars.map((b, i) => {
        const x = 8 + i * 14;
        const midY = 45;
        const bodyY = midY - b.height / 2;
        const color = b.up ? "#22c55e" : "#ef4444";
        return (
          <g key={i}>
            <line
              x1={x + 4}
              x2={x + 4}
              y1={bodyY - b.wick}
              y2={bodyY + b.height + b.wick}
              stroke={color}
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <rect
              x={x}
              y={bodyY}
              width="8"
              height={b.height}
              fill={color}
              fillOpacity={b.up ? 0.9 : 0.85}
              rx="1.2"
            />
          </g>
        );
      })}
    </svg>
  );
}
