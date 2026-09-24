import type { CSSProperties } from "react";
import metal from "../../../public/images/brushed-metal.webp";

// 3×3 field of brushed-metal cubes. Pure CSS 3D (transform-only animations),
// so it stays on the compositor and never blocks interaction.
const CUBES = [
  { x: -1, z: -1, y: -18 }, { x: 0, z: -1, y: 6 }, { x: 1, z: -1, y: -30 },
  { x: -1, z: 0, y: 10 }, { x: 0, z: 0, y: -44, cracked: true }, { x: 1, z: 0, y: 2 },
  { x: -1, z: 1, y: -8 }, { x: 0, z: 1, y: 16 }, { x: 1, z: 1, y: -22 },
];

const FACES = [
  { t: "rotateY(0deg)", shade: 0 },
  { t: "rotateY(180deg)", shade: 0.35 },
  { t: "rotateY(90deg)", shade: 0.22 },
  { t: "rotateY(-90deg)", shade: 0.3 },
  { t: "rotateX(90deg)", shade: -0.12 },
  { t: "rotateX(-90deg)", shade: 0.55 },
];

export function MetalCubes() {
  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-square w-full max-w-[460px] [--gap:86px] [--s:52px] sm:[--gap:112px] sm:[--s:70px]"
      style={{ "--metal-texture": `url(${metal.src})` } as CSSProperties}
    >
      {/* cyan floor glow */}
      <div className="absolute inset-x-[12%] bottom-[10%] h-1/3 rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,224,240,0.28),transparent)] blur-2xl" />
      <div className="absolute inset-0 grid place-items-center [perspective:1100px]">
        <div className="relative h-0 w-0 animate-spin-slow [transform-style:preserve-3d]">
          {CUBES.map((c, i) => (
            <div
              key={i}
              className="absolute [transform-style:preserve-3d]"
              style={{
                transform: `translate3d(calc(${c.x} * var(--gap) - var(--s) / 2), ${c.y}px, calc(${c.z} * var(--gap)))`,
              }}
            >
              <div
                className="relative h-[var(--s)] w-[var(--s)] animate-float [transform-style:preserve-3d]"
                style={{ animationDelay: `${(i % 5) * -1.1}s` }}
              >
                {FACES.map((f, k) => (
                  <div
                    key={k}
                    className="metal-face absolute inset-0 [backface-visibility:hidden]"
                    style={{
                      transform: `${f.t} translateZ(calc(var(--s) / 2))`,
                      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 0 0 200px rgba(${f.shade < 0 ? "255,255,255" : "5,7,10"},${Math.abs(f.shade)})`,
                    }}
                  >
                    {c.cracked && k === 0 && (
                      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full">
                        <path d="M20 0 L18 12 L23 17 L16 25 L21 31 L19 40 M23 17 L33 13 M16 25 L6 29" stroke="#00E0F0" strokeWidth="1.4" fill="none" />
                      </svg>
                    )}
                    {c.cracked && k === 4 && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,224,240,0.55),transparent_70%)]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* diagonal light beam */}
      <div className="motion-decor pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -inset-y-1/4 left-0 w-1/3 animate-beam bg-[linear-gradient(90deg,transparent,rgba(0,224,240,0.18),rgba(230,232,235,0.22),rgba(0,224,240,0.18),transparent)] mix-blend-screen" />
      </div>
    </div>
  );
}
