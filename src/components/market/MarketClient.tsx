"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Newspaper, Search } from "lucide-react";
import { LivePrice } from "./LivePrice";
import { LiveChart } from "./LiveChart";
import { NftPanel } from "./NftPanel";
import { DataSourceBadge, relativeAge } from "./DataSourceBadge";
import { pushToast } from "../toasts";
import type {
  AssetIdentity,
  AssetSearchResult,
  MarketQuote,
} from "@/lib/market/types";
import { FEATURED } from "@/lib/market/featured";

const ASSET_LABELS: Record<AssetIdentity["assetType"], string> = {
  STOCK: "Stock",
  ETF: "ETF",
  CRYPTO: "Crypto",
  NFT_COLLECTION: "NFT",
};

export function MarketClient() {
  const [q, setQ] = useState("");
  const [featured] = useState<AssetIdentity[]>(FEATURED);
  const [results, setResults] = useState<AssetSearchResult[]>(
    FEATURED.map((identity) => ({ identity })),
  );
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AssetIdentity>(FEATURED[0]);
  const [selectedQuote, setSelectedQuote] = useState<MarketQuote | null>(null);
  const [clock, setClock] = useState<{ session: string; isOpen: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/market/clock").then((r) => r.json()).catch(() => null);
      if (res?.ok) setClock({ session: res.data.session, isOpen: res.data.isOpen });
    })();
  }, []);

  // Live search — debounced
  useEffect(() => {
    if (!q.trim()) {
      setResults(featured.map((identity) => ({ identity })));
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const url = new URL("/api/market/search", window.location.origin);
        url.searchParams.set("q", q.trim());
        const res = await fetch(url.toString());
        const json = await res.json();
        if (json.ok) setResults(json.data as AssetSearchResult[]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, featured]);

  const isNft = selected.assetType === "NFT_COLLECTION";
  const isCrypto = selected.assetType === "CRYPTO";

  const onQuote = useCallback((quote: MarketQuote) => setSelectedQuote(quote), []);

  const buildThesisHref = useMemo(() => {
    // NFT theses stay research-only via ?assetType flag
    const params = new URLSearchParams({ symbol: selected.symbol });
    if (isNft) params.set("assetType", "NFT_COLLECTION");
    if (isCrypto) params.set("assetType", "CRYPTO");
    return `/new?${params.toString()}`;
  }, [selected, isNft, isCrypto]);

  return (
    <div>
      {/* Market status strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusStrip
          label="US Equities"
          value={clock?.session ?? "…"}
          hint={
            clock
              ? clock.isOpen
                ? "Market open"
                : "Regular session closed"
              : "Alpaca clock loading"
          }
          color={clock?.isOpen ? "#22c55e" : "#f5b400"}
        />
        <StatusStrip label="Crypto" value="24/7" hint="Continuous market" color="#22c55e" />
        <StatusStrip label="NFT Marketplaces" value="OPEN" hint="OpenSea data" color="#9aa1ae" />
        <StatusStrip
          label="Data Providers"
          value="ALPACA · BINANCE · OPENSEA"
          hint="Priority order"
          color="#9aa1ae"
        />
      </div>

      {/* Search */}
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#1e222c] bg-[#0a0c11] p-2">
        <Search size={16} className="ml-2 text-[#5e6472]" />
        <input
          className="flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-[#5e6472]"
          placeholder="Search stocks, crypto pairs (BTC), or NFT collections (pudgypenguins)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {searching && <Loader2 size={14} className="mr-2 animate-spin text-[#5e6472]" />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Results list */}
        <motion.div
          className="surface overflow-hidden"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between border-b border-[#1e222c] p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-white">
              Results
              <span className="text-xs text-[#5e6472]">({results.length})</span>
            </div>
          </div>
          <div className="divide-y divide-[#12141b]">
            {results.length === 0 && (
              <div className="p-8 text-center text-sm text-[#5e6472]">
                No matches. Try a different symbol or collection name.
              </div>
            )}
            {results.map((r) => {
              const a = r.identity;
              const isSel = selected.symbol === a.symbol && selected.assetType === a.assetType;
              return (
                <button
                  key={`${a.assetType}:${a.symbol}`}
                  onClick={() => {
                    setSelected(a);
                    setSelectedQuote(null);
                  }}
                  className={`flex w-full items-center gap-4 px-4 py-3 text-left transition ${
                    isSel ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#1e222c] bg-[#0b0d12] font-mono text-[11px] font-bold">
                    {a.assetType === "NFT_COLLECTION" ? (
                      <ImageIcon size={14} className="text-[#9aa1ae]" />
                    ) : (
                      a.symbol.split("/")[0].slice(0, 3)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-white">
                        {a.symbol}
                      </span>
                      <span className="text-xs text-[#5e6472]">· {a.displayName}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#5e6472]">
                      <span>{ASSET_LABELS[a.assetType]}</span>
                      {r.hint && <span className="text-[#7a8091]">· {r.hint}</span>}
                      {!a.tradableThroughAlpaca && (
                        <span className="chip">RESEARCH ONLY</span>
                      )}
                    </div>
                  </div>
                  {a.assetType !== "NFT_COLLECTION" ? (
                    <div className="hidden min-w-[180px] items-center justify-end md:flex">
                      <LivePrice
                        symbol={a.symbol}
                        assetType={
                          a.assetType === "CRYPTO"
                            ? "CRYPTO"
                            : "STOCK"
                        }
                        compact
                        refreshMs={20000}
                      />
                    </div>
                  ) : (
                    <div className="hidden min-w-[120px] items-center justify-end text-[11px] text-[#7a8091] md:flex">
                      OpenSea
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Detail panel */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selected.assetType}:${selected.symbol}`}
              className="surface p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
                    {ASSET_LABELS[selected.assetType]}
                    {!selected.tradableThroughAlpaca && " · Research only"}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <div className="font-mono text-lg font-semibold text-white">
                      {selected.symbol}
                    </div>
                    <div className="text-xs text-[#5e6472]">{selected.displayName}</div>
                  </div>
                </div>
                {selectedQuote && (
                  <DataSourceBadge
                    status={selectedQuote.status}
                    source={selectedQuote.source}
                    feed={selectedQuote.feed}
                    timestamp={selectedQuote.timestamp}
                  />
                )}
              </div>

              {isNft ? (
                <NftPanel identity={selected} />
              ) : (
                <>
                  <LivePrice
                    symbol={selected.symbol}
                    assetType={selected.assetType === "CRYPTO" ? "CRYPTO" : "STOCK"}
                    refreshMs={12000}
                    onQuote={onQuote}
                  />

                  {selectedQuote && (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                      <Cell
                        label="24h High"
                        value={fmt(selectedQuote.high24h, selectedQuote.currency)}
                      />
                      <Cell
                        label="24h Low"
                        value={fmt(selectedQuote.low24h, selectedQuote.currency)}
                      />
                      <Cell
                        label={selected.assetType === "CRYPTO" ? "Vol 24h" : "Volume"}
                        value={selectedQuote.volume24h != null
                          ? shortNum(selectedQuote.volume24h)
                          : "—"}
                      />
                      <Cell
                        label={selected.assetType === "CRYPTO" ? "Prev Close" : "Prev Close"}
                        value={fmt(selectedQuote.previousClose, selectedQuote.currency)}
                      />
                    </div>
                  )}

                  <div className="mt-5">
                    <LiveChart
                      symbol={selected.symbol}
                      assetType={selected.assetType === "CRYPTO" ? "CRYPTO" : "STOCK"}
                      window="30D"
                      height={180}
                    />
                  </div>
                </>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={buildThesisHref} className="btn btn-primary flex-1 justify-center">
                  {isNft
                    ? `Create NFT Research on ${selected.displayName}`
                    : `Create Thesis on ${selected.symbol}`}
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    await fetch("/api/watchlist", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        symbol: selected.symbol,
                        assetType: selected.assetType,
                        displayName: selected.displayName,
                      }),
                    });
                    pushToast({
                      kind: "success",
                      title: "Added to watchlist",
                      body: `${selected.symbol} · ${selected.displayName}`,
                    });
                  }}
                >
                  ★ Watchlist
                </button>
                {selectedQuote && (
                  <div className="text-[10px] text-[#5e6472] self-center">
                    Updated {relativeAge(selectedQuote.timestamp)}
                  </div>
                )}
              </div>
              {!selected.tradableThroughAlpaca && (
                <div className="mt-3 rounded-md border border-dashed border-[#2a2f3c] bg-[#0a0c11] p-2.5 text-[11px] text-[#9aa1ae]">
                  <span className="chip chip-warn">RESEARCH ONLY</span>{" "}
                  {isNft
                    ? "NFT collections are analysed for thesis research. Paper trading via Alpaca is not available for this asset class."
                    : "This crypto pair is analysed as research. Paper trading in this hackathon build routes only to Alpaca stock equities."}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="surface p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
              <Newspaper size={12} /> Data Provider Status
            </div>
            <ul className="space-y-1.5 text-xs">
              <ProviderLine label="Alpaca Market Data" scope="US stocks & ETFs" />
              <ProviderLine label="Binance" scope="Crypto spot pairs" />
              <ProviderLine label="CoinGecko" scope="Crypto fallback + broader coverage" />
              <ProviderLine label="OpenSea" scope="NFT collection stats" />
            </ul>
            <div className="mt-3 text-[10px] leading-relaxed text-[#5e6472]">
              Prices, volumes, highs, lows and charts come from these providers. Never fabricated —
              if a provider is unavailable the UI displays DATA UNAVAILABLE rather than a placeholder.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#1e222c] bg-[#0a0c11] p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[#5e6472]">{label}</div>
      <div className="mt-0.5 tabular text-sm text-white">{value}</div>
    </div>
  );
}

function StatusStrip({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <div className="surface p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5e6472]">
        {label}
      </div>
      <div className="mt-1 font-display text-base font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[#7a8091]">{hint}</div>
    </div>
  );
}

function ProviderLine({ label, scope }: { label: string; scope: string }) {
  return (
    <li className="flex items-center justify-between rounded-md border border-[#1e222c] bg-[#0a0c11] px-2.5 py-1.5">
      <span className="text-[#cbd0da]">{label}</span>
      <span className="text-[10px] uppercase tracking-widest text-[#5e6472]">{scope}</span>
    </li>
  );
}

function fmt(v: number | null, currency: string): string {
  if (v == null) return "—";
  const sym = currency === "USD" || currency === "USDT" || currency === "USDC" ? "$" : "";
  return `${sym}${v.toLocaleString(undefined, {
    minimumFractionDigits: Math.abs(v) < 1 ? 4 : 2,
    maximumFractionDigits: Math.abs(v) < 1 ? 4 : 2,
  })}`;
}

function shortNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}
