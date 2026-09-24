import Link from "next/link";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="tb-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6E8EB" />
          <stop offset="1" stopColor="#8A9099" />
        </linearGradient>
      </defs>
      <path d="M5 10l11-6 11 6v12l-11 6-11-6z" stroke="url(#tb-silver)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 10l11 6 11-6M16 16v12" stroke="url(#tb-silver)" strokeWidth="1.2" opacity="0.55" />
      <path d="M16 4v7l-3.5 3.5 4.5 3-1.5 5" stroke="#00E0F0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 rounded-md" aria-label="ThesisBreaker home">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">
        <span className="metal-text">Thesis</span>
        <span className="text-cyan">Breaker</span>
      </span>
    </Link>
  );
}
