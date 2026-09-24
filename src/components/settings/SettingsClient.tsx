"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Info, Loader2, Lock, RefreshCcw, XCircle } from "lucide-react";

interface Account {
  equity: string;
  buying_power: string;
  cash: string;
}

export function SettingsClient({ initialConnected }: { initialConnected: boolean }) {
  const [connected] = useState(initialConnected);
  const [mode, setMode] = useState<"demo" | "live">(initialConnected ? "live" : "demo");
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<number>(0);
  const [lastSync, setLastSync] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const acc = await fetch("/api/alpaca/account").then((r) => r.json());
      setMode(acc.mode ?? "demo");
      setAccount(acc.data);
      const pos = await fetch("/api/alpaca/positions").then((r) => r.json());
      setPositions(Array.isArray(pos.data) ? pos.data.length : 0);
      setLastSync(new Date().toLocaleTimeString());
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  return (
    <div className="space-y-6">
      <motion.div
        className="surface p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1e222c] bg-[#0b0d12]">
              <span className="font-display text-lg text-white">A</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Alpaca</div>
              <div className="text-xs text-[#5e6472]">Broker & paper trading infrastructure</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="chip chip-bull">
                <CheckCircle2 size={12} /> Connected
              </span>
            ) : (
              <span className="chip chip-bear">
                <XCircle size={12} /> Not Connected
              </span>
            )}
            <span className="chip chip-warn">Environment: PAPER</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCell label="Mode" value={mode.toUpperCase()} />
          <StatCell
            label="Equity"
            value={account ? `$${Number(account.equity).toLocaleString()}` : "—"}
          />
          <StatCell
            label="Buying Power"
            value={account ? `$${Number(account.buying_power).toLocaleString()}` : "—"}
          />
          <StatCell label="Positions" value={String(positions)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5e6472]">
          <div className="flex items-center gap-3">
            <span>Last sync {lastSync || "—"}</span>
            <button
              className="btn btn-secondary text-xs"
              onClick={sync}
              disabled={syncing}
            >
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Sync Now
            </button>
          </div>
          <span>Endpoint: paper-api.alpaca.markets</span>
        </div>
      </motion.div>

      <motion.div
        className="surface p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Lock size={14} className="text-[#5e6472]" />
          API Credentials
        </div>
        <p className="mt-1 text-xs text-[#9aa1ae]">
          Credentials are read exclusively from server-side environment variables
          (<code className="rounded bg-[#0a0c11] px-1">ALPACA_API_KEY</code> and{" "}
          <code className="rounded bg-[#0a0c11] px-1">ALPACA_SECRET_KEY</code>). Secrets are
          never sent to the browser, stored in localStorage, or displayed after entry.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">API Key</label>
            <input
              className="input font-mono"
              placeholder={connected ? "•••• configured via env ••••" : "Not set"}
              disabled
            />
          </div>
          <div>
            <label className="label">Secret Key</label>
            <input
              className="input font-mono"
              placeholder={connected ? "•••• configured via env ••••" : "Not set"}
              disabled
            />
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#1e222c] bg-[#0a0c11] p-3 text-xs text-[#9aa1ae]">
          <Info size={14} className="mt-0.5 shrink-0 text-[#f5b400]" />
          To connect a live Alpaca paper account, set{" "}
          <code className="mx-1 rounded bg-[#07080c] px-1 py-0.5">ALPACA_API_KEY</code> and{" "}
          <code className="mx-1 rounded bg-[#07080c] px-1 py-0.5">ALPACA_SECRET_KEY</code> in the
          server environment. Requests are proxied through <code>/api/alpaca/*</code> so the
          secret never leaves the server.
        </div>
      </motion.div>

      <motion.div
        className="surface p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <div className="text-sm font-semibold text-white">Market Data Providers</div>
        <p className="mt-1 text-xs text-[#9aa1ae]">
          Prices, volumes, high/low, historical bars and NFT floors come from the following
          providers in priority order. No price is ever fabricated — providers that fail return
          &ldquo;DATA UNAVAILABLE&rdquo; instead of a placeholder.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <ProviderRow provider="Alpaca Market Data" scope="US stocks & ETFs (primary)" env="ALPACA_API_KEY / ALPACA_SECRET_KEY" />
          <ProviderRow provider="Binance" scope="Crypto spot (primary crypto)" env="Public — no key needed" />
          <ProviderRow provider="CoinGecko" scope="Crypto fallback + broader coverage" env="Optional: COINGECKO_API_KEY" />
          <ProviderRow provider="OpenSea" scope="NFT collections (research only)" env="Optional: OPENSEA_API_KEY" />
        </div>
      </motion.div>

      <motion.div
        className="surface p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="text-sm font-semibold text-white">Safety</div>
        <ul className="mt-3 space-y-2 text-xs text-[#9aa1ae]">
          <li>· All trading is routed exclusively to Alpaca paper endpoints. Live trading is disabled.</li>
          <li>· ThesisBreaker never silently substitutes Demo Broker for the Alpaca Paper Broker. If Alpaca is intended and unavailable, the app shows ALPACA CONNECTION UNAVAILABLE and refuses the order.</li>
          <li>· Every order uses a UUID client_order_id for idempotency; duplicate submissions return the same order.</li>
          <li>· ThesisBreaker will not execute a trade without an explicit user confirmation step and a passing deterministic risk gate.</li>
          <li>· AI analysis is decision support only. Not financial advice.</li>
        </ul>
      </motion.div>
    </div>
  );
}

function ProviderRow({
  provider,
  scope,
  env,
}: {
  provider: string;
  scope: string;
  env: string;
}) {
  return (
    <div className="rounded-md border border-[#1e222c] bg-[#0a0c11] p-3">
      <div className="text-sm font-semibold text-white">{provider}</div>
      <div className="mt-0.5 text-[11px] text-[#9aa1ae]">{scope}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-[#5e6472]">{env}</div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#1e222c] bg-[#0a0c11] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
        {label}
      </div>
      <div className="mt-1 tabular text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
