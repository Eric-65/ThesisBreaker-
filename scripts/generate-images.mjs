#!/usr/bin/env node
/**
 * Generates ThesisBreaker's original brand images into public/images/.
 * Everything is procedural (seeded, deterministic) so there are no third-party
 * licensing questions. Run: node scripts/generate-images.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "images");

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Circuit traces: orthogonal paths with 45° jogs and terminal pads, cyan on near-black. */
function circuitSvg(w, h, seed) {
  const r = rng(seed);
  const grid = 24;
  let paths = "";
  let pads = "";
  for (let i = 0; i < 70; i++) {
    let x = Math.round((r() * w) / grid) * grid;
    let y = Math.round((r() * h) / grid) * grid;
    let d = `M${x} ${y}`;
    const segs = 2 + Math.floor(r() * 4);
    let horiz = r() > 0.5;
    for (let s = 0; s < segs; s++) {
      const len = grid * (2 + Math.floor(r() * 8));
      const dir = r() > 0.5 ? 1 : -1;
      if (horiz) x += len * dir;
      else y += len * dir;
      d += ` L${x} ${y}`;
      if (r() > 0.6) {
        const j = grid * (1 + Math.floor(r() * 2));
        x += j * (r() > 0.5 ? 1 : -1);
        y += j * (r() > 0.5 ? 1 : -1);
        d += ` L${x} ${y}`;
      }
      horiz = !horiz;
    }
    const bright = r() > 0.8;
    paths += `<path d="${d}" stroke="${bright ? "#00E0F0" : "#1E6F78"}" stroke-opacity="${bright ? 0.75 : 0.45}" stroke-width="${bright ? 1.4 : 1}" fill="none"/>`;
    pads += `<circle cx="${x}" cy="${y}" r="${bright ? 3 : 2}" fill="${bright ? "#00E0F0" : "#2A8F99"}" fill-opacity="${bright ? 0.9 : 0.5}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="g1" cx="0.78" cy="0.2" r="0.7"><stop offset="0" stop-color="#00E0F0" stop-opacity="0.22"/><stop offset="1" stop-color="#00E0F0" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#05070A" stop-opacity="0"/><stop offset="1" stop-color="#05070A" stop-opacity="0.95"/></radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="100%" height="100%" fill="#05070A"/>
  <rect width="100%" height="100%" fill="url(#g1)"/>
  <g filter="url(#glow)">${paths}${pads}</g>
  <rect width="100%" height="100%" fill="url(#vig)"/>
</svg>`;
}

/** Brushed metal: anisotropic turbulence (long in x, short in y) over a silver gradient. */
function brushedMetalSvg(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6E8EB"/><stop offset="0.5" stop-color="#B4BAC2"/><stop offset="1" stop-color="#8A9099"/></linearGradient>
    <filter id="brush" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="3" seed="7"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.9 0 0 0 -0.2"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#s)"/>
  <rect width="100%" height="100%" filter="url(#brush)" opacity="0.55" style="mix-blend-mode:overlay"/>
</svg>`;
}

/** Cracked glass: branching fracture lines radiating from an impact point. */
function crackSvg(w, h, seed) {
  const r = rng(seed);
  const cx = w * 0.62;
  const cy = h * 0.42;
  let d = "";
  const branch = (x, y, angle, len, depth) => {
    let px = x;
    let py = y;
    const steps = 4 + Math.floor(r() * 5);
    let seg = `M${px.toFixed(1)} ${py.toFixed(1)}`;
    for (let i = 0; i < steps; i++) {
      angle += (r() - 0.5) * 0.5;
      const l = len / steps;
      px += Math.cos(angle) * l;
      py += Math.sin(angle) * l;
      seg += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
      if (depth < 3 && r() > 0.72) branch(px, py, angle + (r() > 0.5 ? 0.6 : -0.6), len * 0.45, depth + 1);
    }
    d += seg;
  };
  for (let i = 0; i < 16; i++) branch(cx, cy, (i / 16) * Math.PI * 2 + r() * 0.3, Math.max(w, h) * (0.35 + r() * 0.4), 0);
  let rings = "";
  for (let k = 1; k <= 3; k++) {
    let ring = "";
    for (let a = 0; a <= 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      const rad = k * 60 + (r() - 0.5) * 30;
      ring += `${a ? "L" : "M"}${(cx + Math.cos(t) * rad).toFixed(1)} ${(cy + Math.sin(t) * rad).toFixed(1)} `;
    }
    rings += `<path d="${ring}" stroke="#CFE9EC" stroke-opacity="${0.35 / k}" stroke-width="0.8" fill="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><radialGradient id="c" cx="0.62" cy="0.42" r="0.6"><stop offset="0" stop-color="#00E0F0" stop-opacity="0.18"/><stop offset="1" stop-color="#05070A" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="#05070A"/>
  <rect width="100%" height="100%" fill="url(#c)"/>
  <path d="${d}" stroke="#E6E8EB" stroke-opacity="0.55" stroke-width="1" fill="none"/>
  <path d="${d}" stroke="#00E0F0" stroke-opacity="0.25" stroke-width="3" fill="none"/>
  ${rings}
</svg>`;
}

async function write(name, svg, { width, quality = 72 } = {}) {
  const base = sharp(Buffer.from(svg));
  const img = width ? base.resize({ width }) : base;
  await img.clone().webp({ quality, effort: 6 }).toFile(path.join(OUT, `${name}.webp`));
  await img.clone().avif({ quality: quality - 22, effort: 6 }).toFile(path.join(OUT, `${name}.avif`));
  console.log("wrote", name);
}

await mkdir(OUT, { recursive: true });
await write("circuit-backdrop", circuitSvg(1920, 1080, 42));
await write("brushed-metal", brushedMetalSvg(512, 512), { quality: 80 });
await write("cracked-glass", crackSvg(1600, 900, 7));
