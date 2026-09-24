import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-muted sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-start gap-3">
          <LogoMark className="h-6 w-6 shrink-0" />
          <div className="space-y-1">
            <p className="text-ink">Built on Bitget Agent Hub · Powered by Qwen</p>
            <p className="text-xs">
              Research tool, not financial advice. Verdicts describe assumptions, not future prices. You make every trading decision.
            </p>
          </div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/analyze" className="hover:text-ink">Analyze</Link>
          <Link href="/history" className="hover:text-ink">History</Link>
          <Link href="/about" className="hover:text-ink">About &amp; data sources</Link>
        </nav>
      </div>
    </footer>
  );
}
