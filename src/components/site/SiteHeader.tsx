"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/analyze", label: "Analyze" },
  { href: "/history", label: "History" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-bg/80 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          {NAV.map((n) => {
            const active = path === n.href || path.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-2.5 py-2 text-sm transition-colors sm:px-3 ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {n.label}
                <span
                  aria-hidden
                  className={`mx-auto mt-0.5 block h-px bg-cyan transition-opacity ${active ? "w-full opacity-100" : "w-0 opacity-0"}`}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
