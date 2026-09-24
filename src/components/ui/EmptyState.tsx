import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Original empty-state illustration: a metal cube with a cyan fracture. */
export function EmptyState({ title, body, cta = true }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="glass flex flex-col items-center px-6 py-14 text-center">
      <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden fill="none">
        <defs>
          <linearGradient id="es-s" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E6E8EB" />
            <stop offset="1" stopColor="#8A9099" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="102" rx="34" ry="6" fill="#00E0F0" opacity="0.15" />
        <path d="M60 18l34 19v40L60 96 26 77V37z" fill="#151B23" stroke="url(#es-s)" strokeWidth="2" />
        <path d="M26 37l34 19 34-19M60 56v40" stroke="url(#es-s)" strokeWidth="1.5" opacity="0.6" />
        <path d="M60 18v14l-6 7 8 6-3 11" stroke="#00E0F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{body}</p>
      {cta && (
        <Link href="/analyze" className="btn btn-primary mt-6">
          Stress-test a trade <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
