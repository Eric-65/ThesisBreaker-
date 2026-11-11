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
            <p className="text-xs">
              <span className="text-ink/80">Privacy:</span> we set one anonymous cookie (a random ID) so your stress tests
              appear in your history and we can count visits. We store the trade ideas you submit and their analyses, plus
              your email if you choose to sign in. No raw IP addresses, no ad or third-party trackers.{" "}
              <Link href="/privacy" className="underline hover:text-ink">Read the privacy policy</Link>.
            </p>
          </div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/analyze" className="hover:text-ink">Analyze</Link>
          <Link href="/history" className="hover:text-ink">History</Link>
          <Link href="/community" className="hover:text-ink">Community</Link>
          <Link href="/about" className="hover:text-ink">About &amp; data sources</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
