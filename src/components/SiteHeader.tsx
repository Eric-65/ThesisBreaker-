"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[#12141b]/80 bg-[#06070a]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/#how" className="text-sm text-[#9aa1ae] hover:text-white">
              How it works
            </Link>
            <Link href="/#prove" className="text-sm text-[#9aa1ae] hover:text-white">
              Prove me wrong
            </Link>
            <Link href="/dashboard" className="text-sm text-[#9aa1ae] hover:text-white">
              Dashboard
            </Link>
            <Link href="/market" className="text-sm text-[#9aa1ae] hover:text-white">
              Market
            </Link>
          </nav>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="chip">Paper Mode</span>
          <Link href="/new" className="btn btn-primary">
            Break a New Thesis →
          </Link>
        </div>
        <button
          className="btn btn-secondary md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-[#12141b] bg-[#06070a] md:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            <Link href="/#how" className="rounded-md px-3 py-2 text-sm text-[#cbd0da] hover:bg-white/5">
              How it works
            </Link>
            <Link href="/#prove" className="rounded-md px-3 py-2 text-sm text-[#cbd0da] hover:bg-white/5">
              Prove me wrong
            </Link>
            <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm text-[#cbd0da] hover:bg-white/5">
              Dashboard
            </Link>
            <Link href="/market" className="rounded-md px-3 py-2 text-sm text-[#cbd0da] hover:bg-white/5">
              Market
            </Link>
            <Link href="/new" className="btn btn-primary mt-2 justify-center">
              Break a New Thesis →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
