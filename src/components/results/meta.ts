import type { AssumptionStatus, Category, Verdict } from "@/lib/analysis/types";

export const VERDICT_META: Record<Verdict, { label: string; color: string; text: string; blurb: string }> = {
  PASS: { label: "PASS", color: "#22C55E", text: "text-pass", blurb: "No load-bearing assumption looks false right now." },
  REVISE: { label: "REVISE", color: "#F5B800", text: "text-revise", blurb: "Fixable weak links — adjust size, timing or entry, or get confirmation." },
  BLOCK: { label: "BLOCK", color: "#FF4D4F", text: "text-block", blurb: "A load-bearing assumption is broken right now." },
};

export const STATUS_META: Record<AssumptionStatus, { label: string; color: string; text: string }> = {
  holds: { label: "Holds", color: "#22C55E", text: "text-pass" },
  weak: { label: "Weak", color: "#F5B800", text: "text-revise" },
  broken: { label: "Broken", color: "#FF4D4F", text: "text-block" },
};

export const CATEGORY_LABEL: Record<Category, string> = {
  fundamental: "Fundamental",
  technical: "Technical",
  timing: "Timing",
  liquidity: "Liquidity",
  macro: "Macro",
  sentiment: "Sentiment",
};
