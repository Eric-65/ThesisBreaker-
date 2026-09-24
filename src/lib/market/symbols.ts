import "server-only";
import type { AssetClass } from "@/lib/analysis/types";
import type { MarketDataProvider, TradableSymbol } from "./provider";
import { isCrypto, isEquity } from "./universe";

export interface ResolvedSymbol {
  underlying: string;
  exchangeSymbol: string;
  assetClass: AssetClass;
}

/**
 * Pin a mapping here once it has been confirmed against Bitget's docs or live
 * responses, e.g. { NVDA: "RNVDAUSDT" }. Empty by default: resolution below
 * always checks the live symbol list, so we never trade on a guessed symbol.
 */
const VERIFIED_OVERRIDES: Record<string, string> = {};

/**
 * Candidate base coins for a tokenized U.S. stock, in preference order. Bitget
 * rTokens are expected to be "R" + ticker (e.g. RNVDA/USDT); the other patterns
 * cover other tokenized-stock issuers Bitget may list. Only candidates that
 * exist and are online in the live list are ever used.
 */
function equityBases(t: string): string[] {
  return [`R${t}`, `${t}ON`, `${t}X`];
}

export async function resolveSymbol(
  provider: MarketDataProvider,
  underlying: string,
  hint?: AssetClass | null,
): Promise<ResolvedSymbol | null> {
  const t = underlying.toUpperCase();
  const list = await provider.listSymbols();
  const bySymbol = new Map<string, TradableSymbol>(list.map((s) => [s.symbol, s]));
  const usdt = list.filter((s) => s.quoteCoin === "USDT" && s.online);

  const override = VERIFIED_OVERRIDES[t];
  if (override && bySymbol.get(override)?.online) {
    return {
      underlying: t,
      exchangeSymbol: override,
      assetClass: isCrypto(t) ? "crypto" : "stock_token",
    };
  }

  const wantsEquity = hint === "stock_token" || (hint !== "crypto" && isEquity(t));
  if (wantsEquity) {
    for (const base of equityBases(t)) {
      const hit = usdt.find((s) => s.baseCoin === base);
      if (hit) return { underlying: t, exchangeSymbol: hit.symbol, assetClass: "stock_token" };
    }
    return null;
  }

  const hit = usdt.find((s) => s.baseCoin === t);
  return hit ? { underlying: t, exchangeSymbol: hit.symbol, assetClass: "crypto" } : null;
}
