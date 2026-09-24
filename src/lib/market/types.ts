/** Common market-data types shared across providers. */

export type AssetType = "STOCK" | "ETF" | "CRYPTO" | "NFT_COLLECTION";

export type DataStatus = "LIVE" | "DELAYED" | "STALE" | "UNAVAILABLE" | "DEMO";

export type ProviderId =
  | "ALPACA_STOCK"
  | "ALPACA_CRYPTO"
  | "BINANCE"
  | "COINGECKO"
  | "OPENSEA"
  | "DEMO";

export interface AssetIdentity {
  symbol: string;
  displayName: string;
  assetType: AssetType;
  currency: string; // "USD", "USDT", "ETH"
  tradableThroughAlpaca: boolean;
  /** Slug used to look up NFT collections on OpenSea */
  openSeaSlug?: string;
  /** Binance trading pair, e.g. "BTCUSDT" */
  binancePair?: string;
  /** CoinGecko coin id, e.g. "bitcoin" */
  coingeckoId?: string;
}

/** Normalized market quote used across all providers. */
export interface MarketQuote {
  symbol: string;
  name: string;
  assetType: AssetType;
  price: number | null;
  bid: number | null;
  ask: number | null;
  change24h: number | null;
  changePercent24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  high24h: number | null;
  low24h: number | null;
  previousClose: number | null;
  currency: string;
  timestamp: string; // ISO UTC
  source: ProviderId;
  feed?: string; // e.g. "iex", "sip", "binance-spot"
  status: DataStatus;
}

export interface HistoricalBar {
  t: string; // ISO UTC
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface HistoricalSeries {
  symbol: string;
  timeframe: string; // "1D", "1H", "30D-FLOOR"
  bars: HistoricalBar[];
  source: ProviderId;
  status: DataStatus;
  fetchedAt: string;
}

export interface NftStats {
  slug: string;
  name: string;
  chain: string;
  imageUrl: string | null;
  floorPrice: number | null;
  floorCurrency: string; // "ETH"
  totalVolume: number | null;
  volume24h: number | null;
  sales24h: number | null;
  owners: number | null;
  totalSupply: number | null;
  source: ProviderId; // "OPENSEA"
  status: DataStatus;
  timestamp: string;
}

export interface NftFloorPoint {
  t: string; // ISO
  floor: number; // in floorCurrency (ETH)
}

export interface NftFloorSeries {
  slug: string;
  points: NftFloorPoint[];
  currency: string;
  source: ProviderId;
  status: DataStatus;
  fetchedAt: string;
}

export interface AssetSearchResult {
  identity: AssetIdentity;
  hint?: string;
}

/** Freshness thresholds (seconds) beyond which a quote is STALE. */
export const FRESHNESS_SECONDS: Record<AssetType, number> = {
  STOCK: 90, // ~90s tolerates minor delayed feed skew
  ETF: 90,
  CRYPTO: 30,
  NFT_COLLECTION: 600, // 10 min is fine for floor prices
};

export function classifyFreshness(
  timestamp: string,
  assetType: AssetType,
  providedStatus?: DataStatus,
): DataStatus {
  if (providedStatus === "UNAVAILABLE" || providedStatus === "DEMO") return providedStatus;
  const t = new Date(timestamp).getTime();
  if (!Number.isFinite(t)) return "UNAVAILABLE";
  const ageSec = (Date.now() - t) / 1000;
  const limit = FRESHNESS_SECONDS[assetType] ?? 120;
  if (ageSec > limit * 4) return "STALE";
  if (providedStatus === "DELAYED") return "DELAYED";
  if (ageSec > limit) return "STALE";
  return providedStatus ?? "LIVE";
}
