import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DisclaimerBar } from "@/components/site/DisclaimerBar";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "ThesisBreaker — Break your thesis before the market does",
    template: "%s · ThesisBreaker",
  },
  description:
    "A pre-trade red team for tokenized U.S. stocks and crypto. ThesisBreaker extracts the hidden assumptions in your trade idea, tests each against live evidence, and returns PASS, REVISE or BLOCK.",
  icons: {
    icon:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#05070A'/><path d='M9 11l7-4 7 4v10l-7 4-7-4z' fill='none' stroke='#C9CED5' stroke-width='1.6'/><path d='M16 7v8l-3 3 4 3-1 4' fill='none' stroke='#00E0F0' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>`,
      ),
  },
};

export const viewport: Viewport = {
  themeColor: "#05070A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <div className="backdrop" aria-hidden />
        <MotionProvider>
          <div className="sticky top-0 z-40">
            <DisclaimerBar />
            <SiteHeader />
          </div>
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
