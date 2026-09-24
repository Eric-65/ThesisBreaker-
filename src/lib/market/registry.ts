import type { AssetIdentity } from "./types";

/**
 * Registry of well-known assets so the search bar can immediately resolve
 * common tickers to the correct provider. This is a small routing table,
 * NOT a source of prices — every displayed value still comes from a live
 * provider through the router.
 */

export const STOCKS: Record<string, AssetIdentity> = {
  NVDA: id("NVDA", "NVIDIA Corp.", "STOCK", "ALPACA_STOCK"),
  AAPL: id("AAPL", "Apple Inc.", "STOCK", "ALPACA_STOCK"),
  MSFT: id("MSFT", "Microsoft Corp.", "STOCK", "ALPACA_STOCK"),
  TSLA: id("TSLA", "Tesla Inc.", "STOCK", "ALPACA_STOCK"),
  AMD: id("AMD", "Advanced Micro Devices", "STOCK", "ALPACA_STOCK"),
  AMZN: id("AMZN", "Amazon.com Inc.", "STOCK", "ALPACA_STOCK"),
  META: id("META", "Meta Platforms Inc.", "STOCK", "ALPACA_STOCK"),
  GOOGL: id("GOOGL", "Alphabet Inc. Class A", "STOCK", "ALPACA_STOCK"),
  SPY: id("SPY", "SPDR S&P 500 ETF", "ETF", "ALPACA_STOCK"),
  QQQ: id("QQQ", "Invesco QQQ Trust", "ETF", "ALPACA_STOCK"),
};

export const CRYPTO: Record<string, AssetIdentity> = {
  "BTC/USDT": crypto("BTC/USDT", "Bitcoin", "BTCUSDT", "bitcoin", "USDT"),
  "ETH/USDT": crypto("ETH/USDT", "Ethereum", "ETHUSDT", "ethereum", "USDT"),
  "SOL/USDT": crypto("SOL/USDT", "Solana", "SOLUSDT", "solana", "USDT"),
  "BNB/USDT": crypto("BNB/USDT", "BNB", "BNBUSDT", "binancecoin", "USDT"),
  "XRP/USDT": crypto("XRP/USDT", "XRP", "XRPUSDT", "ripple", "USDT"),
  "DOGE/USDT": crypto("DOGE/USDT", "Dogecoin", "DOGEUSDT", "dogecoin", "USDT"),
};

/** Featured NFT collections. `slug` is the OpenSea identifier. */
export const NFTS: Record<string, AssetIdentity> = {
  "pudgypenguins": nft("pudgypenguins", "Pudgy Penguins"),
  "boredapeyachtclub": nft("boredapeyachtclub", "Bored Ape Yacht Club"),
  "azuki": nft("azuki", "Azuki"),
  "doodles-official": nft("doodles-official", "Doodles"),
  "milady": nft("milady", "Milady Maker"),
};

export function findByAny(query: string): AssetIdentity | null {
  const q = query.trim().toUpperCase();
  if (STOCKS[q]) return STOCKS[q];

  // Crypto: accept "BTC", "BTCUSDT", or "BTC/USDT"
  const cryptoMatches = Object.values(CRYPTO).find(
    (c) =>
      c.symbol === q ||
      c.binancePair === q.replace("/", "") ||
      c.symbol.split("/")[0] === q,
  );
  if (cryptoMatches) return cryptoMatches;

  const slug = query.trim().toLowerCase();
  if (NFTS[slug]) return NFTS[slug];
  return null;
}

function id(
  symbol: string,
  displayName: string,
  assetType: AssetIdentity["assetType"],
  provider: AssetIdentity["assetType"] extends "NFT_COLLECTION"
    ? "OPENSEA"
    : "ALPACA_STOCK",
): AssetIdentity {
  return {
    symbol,
    displayName,
    assetType,
    currency: "USD",
    tradableThroughAlpaca: assetType === "STOCK" || assetType === "ETF",
    // provider is implicit for stocks/ETFs
    ...(provider ? {} : {}),
  };
}

function crypto(
  symbol: string,
  displayName: string,
  binancePair: string,
  coingeckoId: string,
  currency: string,
): AssetIdentity {
  return {
    symbol,
    displayName,
    assetType: "CRYPTO",
    currency,
    tradableThroughAlpaca: false, // paper stock account — crypto is research-only in this hackathon
    binancePair,
    coingeckoId,
  };
}

function nft(slug: string, displayName: string): AssetIdentity {
  return {
    symbol: slug,
    displayName,
    assetType: "NFT_COLLECTION",
    currency: "ETH",
    tradableThroughAlpaca: false,
    openSeaSlug: slug,
  };
}

export const FEATURED: AssetIdentity[] = [
  ...Object.values(STOCKS),
  ...Object.values(CRYPTO),
  ...Object.values(NFTS),
];
