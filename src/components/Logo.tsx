import Link from "next/link";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a2f3c] bg-[#0b0d12]">
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
          <path
            d="M6 22L13 10L17 18L26 8"
            stroke="#ef4444"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="8" r="1.6" fill="#22c55e" />
        </svg>
      </span>
      <span className={small ? "text-sm font-semibold tracking-tight" : "text-[15px] font-semibold tracking-tight"}>
        Thesis<span className="text-[#ef4444]">Breaker</span>
      </span>
    </Link>
  );
}
