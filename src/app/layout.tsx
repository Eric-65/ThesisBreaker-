import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThesisBreaker — Before you trade it, try to break it.",
  description:
    "ThesisBreaker challenges your trade ideas, tests their assumptions, searches for contradictory evidence, and only then moves strong ideas into Alpaca paper trading.",
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#0b0d12'/><path d='M8 22L14 10L18 18L24 10' fill='none' stroke='#ef4444' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/></svg>`,
          ),
      },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
