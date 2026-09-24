"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Swords,
  LineChart,
  Newspaper,
  History,
  Settings,
  Menu,
  X,
  Circle,
  Bell,
} from "lucide-react";
import { Logo } from "./Logo";
import { AgentStatusBadge } from "./AgentStatus";
import { ToastHost } from "./toasts";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New Thesis", icon: Swords },
  { href: "/trading", label: "Paper Trading", icon: LineChart },
  { href: "/market", label: "Market", icon: Newspaper },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/history", label: "Thesis History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#12141b] bg-[#07080c]/80 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center border-b border-[#12141b] px-5">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/[0.05] text-white"
                    : "text-[#9aa1ae] hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <Icon size={16} className={active ? "text-[#ef4444]" : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#12141b] p-4">
          <div className="rounded-lg border border-[#1e222c] bg-[#0b0d12] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#9aa1ae]">
              <Circle size={8} className="fill-[#f5b400] text-[#f5b400]" />
              Paper Mode
            </div>
            <p className="mt-1 text-xs text-[#5e6472]">
              All trades are simulated via Alpaca paper trading.
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#12141b] bg-[#06070a]/80 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <button
              className="btn btn-secondary"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
            <Logo small />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5e6472]">
              ThesisBreaker
            </span>
            <span className="h-3 w-px bg-[#1e222c]" />
            <AgentStatusBadge />
            <span className="chip chip-warn">Paper Mode</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/new" className="btn btn-primary">
              <Swords size={14} /> Break Thesis
            </Link>
          </div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 border-r border-[#12141b] bg-[#07080c] p-4">
              <div className="mb-4 flex items-center justify-between">
                <Logo />
                <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-white/[0.05] text-white"
                          : "text-[#9aa1ae] hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-[#ef4444]" : ""} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>
      <ToastHost />
    </div>
  );
}
