"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, Bell } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastKind = "success" | "warn" | "error" | "info" | "agent";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  ms?: number;
}

let list: Toast[] = [];
const listeners = new Set<(t: Toast[]) => void>();

export function pushToast(t: Omit<Toast, "id">) {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const toast: Toast = { id, ms: 4500, ...t };
  list = [...list, toast];
  for (const l of listeners) l(list);
  setTimeout(() => {
    list = list.filter((x) => x.id !== id);
    for (const l of listeners) l(list);
  }, toast.ms);
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>(list);
  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 md:right-4 md:bottom-4 md:left-auto md:items-end">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="pointer-events-auto w-full max-w-sm rounded-xl border border-[#1e222c] bg-[#0b0d12]/95 p-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            style={{
              borderColor:
                t.kind === "success"
                  ? "#166534"
                  : t.kind === "warn"
                    ? "#a67c00"
                    : t.kind === "error"
                      ? "#7f1d1d"
                      : "#1e222c",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                style={{
                  borderColor:
                    t.kind === "success"
                      ? "#166534"
                      : t.kind === "warn"
                        ? "#a67c00"
                        : t.kind === "error"
                          ? "#7f1d1d"
                          : "#1e222c",
                  background:
                    t.kind === "success"
                      ? "#0a2f19"
                      : t.kind === "warn"
                        ? "#231a05"
                        : t.kind === "error"
                          ? "#210a0a"
                          : "#0a0c11",
                  color:
                    t.kind === "success"
                      ? "#86efac"
                      : t.kind === "warn"
                        ? "#fcd34d"
                        : t.kind === "error"
                          ? "#fca5a5"
                          : t.kind === "agent"
                            ? "#ef4444"
                            : "#9aa1ae",
                }}
              >
                {t.kind === "success" ? (
                  <CheckCircle2 size={14} />
                ) : t.kind === "warn" ? (
                  <AlertTriangle size={14} />
                ) : t.kind === "error" ? (
                  <XCircle size={14} />
                ) : t.kind === "agent" ? (
                  <Bell size={14} />
                ) : (
                  <Info size={14} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                {t.body && (
                  <div className="mt-0.5 text-xs leading-relaxed text-[#9aa1ae]">{t.body}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
