import type {
  AssetIdentity,
  AssetSearchResult,
  HistoricalSeries,
  MarketQuote,
  NftFloorSeries,
  NftStats,
} from "./types";
import { classifyFreshness } from "./types";
import {
  alpacaStockAsset,
  alpacaStockBars,
  alpacaStockQuote,
} from "./providers/alpacaStock";
import { binanceBars, binanceQuote } from "./providers/binance";
import {
  coingeckoHistory,
  coingeckoQuote,
  coingeckoSearch,
} from "./providers/coingecko";
import {
  openseaCollection,
  openseaFloorHistory,
  openseaSearch,
} from "./providers/opensea";
import { CRYPTO, FEATURED, NFTS, STOCKS, findByAny } from "./registry";

/**
 * MarketDataRouter — single entry point for the app + AI pipeline.
 * Chooses the correct provider for each asset type and applies the
 * documented fallback order.
 */

export async function getQuote(identity: AssetIdentity): Promise<MarketQuote> {
  const t = identity.assetType;
  if (t === "STOCK" || t === "ETF") {
    const q = await alpacaStockQuote(identity.symbol, identity.displayName);
    return q ?? unavailable(identity);
  }
  if (t === "CRYPTO") {
    // 1) Binance (primary public data source)
    if (identity.binancePair) {
      const b = await binanceQuote(identity.binancePair, identity.displayName);
      if (b) return b;
    }
    // 2) CoinGecko fallback
    if (identity.coingeckoId) {
      const c = await coingeckoQuote(identity.coingeckoId, identity.symbol.split("/")[0]);
      if (c) return c;
    }
    return unavailable(identity);
  }
  // NFT collections don't have per-share prices; callers should use getNft().
  return unavailable(identity);
}

export async function getBars(
  identity: AssetIdentity,
  window: "30D" | "7D" | "1D" = "30D",
): Promise<HistoricalSeries | null> {
  const t = identity.assetType;
  if (t === "STOCK" || t === "ETF") {
    const limit = window === "1D" ? 78 : window === "7D" ? 7 : 30;
    const timeframe = window === "1D" ? "15Min" : "1Day";
    return alpacaStockBars(identity.symbol, timeframe as "1Day" | "15Min", limit);
  }
  if (t === "CRYPTO") {
    const interval = window === "1D" ? "15m" : window === "7D" ? "1h" : "1d";
    const limit = window === "1D" ? 96 : window === "7D" ? 168 : 30;
    if (identity.binancePair) {
      const b = await binanceBars(identity.binancePair, interval as "1d" | "1h" | "15m", limit);
      if (b) return b;
    }
    if (identity.coingeckoId) {
      const days = window === "1D" ? 1 : window === "7D" ? 7 : 30;
      return coingeckoHistory(identity.coingeckoId, days);
    }
  }
  return null;
}

export async function getNft(identity: AssetIdentity): Promise<NftStats | null> {
  if (identity.assetType !== "NFT_COLLECTION" || !identity.openSeaSlug) return null;
  return openseaCollection(identity.openSeaSlug);
}

export async function getNftHistory(identity: AssetIdentity): Promise<NftFloorSeries | null> {
  if (identity.assetType !== "NFT_COLLECTION" || !identity.openSeaSlug) return null;
  return openseaFloorHistory(identity.openSeaSlug);
}

/** Unified search — merges featured registry with provider search results. */
export async function search(q: string): Promise<AssetSearchResult[]> {
  const query = q.trim();
  if (!query) return FEATURED.map((identity) => ({ identity }));

  const results = new Map<string, AssetSearchResult>();

  // 1) Registry-first (instant, no external call)
  for (const asset of FEATURED) {
    if (
      asset.symbol.toUpperCase().includes(query.toUpperCase()) ||
      asset.displayName.toUpperCase().includes(query.toUpperCase())
    ) {
      results.set(`${asset.assetType}:${asset.symbol}`, { identity: asset });
    }
  }

  // 2) Alpaca asset lookup for a full-ticker match
  if (/^[A-Za-z]{1,5}$/.test(query)) {
    const asset = await alpacaStockAsset(query);
    if (asset && asset.tradable) {
      const identity: AssetIdentity = {
        symbol: asset.symbol,
        displayName: asset.name,
        assetType: "STOCK",
        currency: "USD",
        tradableThroughAlpaca: true,
      };
      results.set(`STOCK:${asset.symbol}`, { identity, hint: "Alpaca tradable" });
    }
  }

  // 3) CoinGecko search for crypto keywords
  if (query.length >= 2) {
    const coins = await coingeckoSearch(query);
    for (const c of coins) {
      const sym = c.symbol.toUpperCase();
      const key = `CRYPTO:${sym}`;
      if (results.has(key)) continue;
      // Try to attach a Binance pair if one exists in the registry
      const known = Object.values(CRYPTO).find((k) => k.coingeckoId === c.id);
      const identity: AssetIdentity = known ?? {
        symbol: `${sym}/USD`,
        displayName: c.name,
        assetType: "CRYPTO",
        currency: "USD",
        tradableThroughAlpaca: false,
        coingeckoId: c.id,
        binancePair: `${sym}USDT`,
      };
      results.set(key, { identity, hint: "CoinGecko" });
    }
  }

  // 4) OpenSea collection search
  if (query.length >= 3) {
    const colls = await openseaSearch(query);
    for (const c of colls) {
      const key = `NFT:${c.collection}`;
      if (results.has(key)) continue;
      const identity: AssetIdentity = NFTS[c.collection] ?? {
        symbol: c.collection,
        displayName: c.name,
        assetType: "NFT_COLLECTION",
        currency: "ETH",
        tradableThroughAlpaca: false,
        openSeaSlug: c.collection,
      };
      results.set(key, { identity, hint: "OpenSea" });
    }
  }

  return Array.from(results.values()).slice(0, 20);
}

export function resolveIdentity(symbolOrSlug: string): AssetIdentity | null {
  const s = symbolOrSlug.trim();
  return findByAny(s) ?? STOCKS[s.toUpperCase()] ?? null;
}

function unavailable(identity: AssetIdentity): MarketQuote {
  const ts = new Date().toISOString();
  return {
    symbol: identity.symbol,
    name: identity.displayName,
    assetType: identity.assetType,
    price: null,
    bid: null,
    ask: null,
    change24h: null,
    changePercent24h: null,
    volume24h: null,
    marketCap: null,
    high24h: null,
    low24h: null,
    previousClose: null,
    currency: identity.currency,
    timestamp: ts,
    source:
      identity.assetType === "CRYPTO"
        ? "BINANCE"
        : identity.assetType === "NFT_COLLECTION"
          ? "OPENSEA"
          : "ALPACA_STOCK",
    feed: "unavailable",
    status: "UNAVAILABLE",
  };
}

// Re-export a small helper used by the AI pipeline
export { classifyFreshness };
