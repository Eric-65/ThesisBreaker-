"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onTick: () => void) => {
  const id = setInterval(onTick, 60_000);
  return () => clearInterval(id);
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

function format(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? "yesterday" : `${d} days ago`;
  const mo = Math.floor(d / 30);
  return mo < 12 ? (mo === 1 ? "a month ago" : `${mo} months ago`) : "over a year ago";
}

/**
 * "5 min ago", kept current in the browser. `renderedAt` (when the server
 * built the page) is the clock used for the server render and hydration, so
 * the markup matches before the live clock takes over.
 */
export function RelativeTime({ iso, renderedAt }: { iso: string; renderedAt: string }) {
  const minute = useSyncExternalStore(subscribe, minuteNow, () => Math.floor(Date.parse(renderedAt) / 60_000));
  return (
    <time dateTime={iso} title={new Date(iso).toUTCString()}>
      {format(Date.parse(iso), minute * 60_000 + 59_999)}
    </time>
  );
}
