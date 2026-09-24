// Shared (client-safe) lists of *underlying* tickers. These are not Bitget
// symbols — exchange symbols are resolved against Bitget's live symbol list in
// ./symbols.ts, so nothing here is a guess about what Bitget lists.

/** U.S. equities/ETFs that may exist as tokenized stocks (rTokens) on Bitget. */
export const US_EQUITIES = [
  "NVDA", "TSLA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "NFLX", "AMD", "AVGO",
  "COIN", "MSTR", "HOOD", "PLTR", "INTC", "ORCL", "CRM", "UBER", "SHOP", "BABA",
  "JPM", "V", "MA", "DIS", "NKE", "KO", "MCD", "WMT", "COST", "SMCI", "ARM", "TSM",
  "SPY", "QQQ", "IWM", "GLD",
] as const;

export const CRYPTO = [
  "BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "LINK", "TON", "SUI", "BGB",
  "LTC", "DOT", "TRX", "PEPE", "ARB", "OP",
] as const;

/** Plain-English names people type instead of tickers. */
export const NAME_TO_TICKER: Record<string, string> = {
  nvidia: "NVDA", tesla: "TSLA", apple: "AAPL", microsoft: "MSFT", amazon: "AMZN",
  google: "GOOGL", alphabet: "GOOGL", meta: "META", facebook: "META", netflix: "NFLX",
  coinbase: "COIN", microstrategy: "MSTR", robinhood: "HOOD", palantir: "PLTR",
  broadcom: "AVGO", intel: "INTC", oracle: "ORCL", "s&p": "SPY", nasdaq: "QQQ",
  bitcoin: "BTC", ethereum: "ETH", ether: "ETH", solana: "SOL", ripple: "XRP",
  dogecoin: "DOGE", cardano: "ADA", chainlink: "LINK",
};

/** Default rows for the landing-page ticker strip; unresolvable ones are dropped. */
export const STRIP_UNDERLYINGS = [
  "NVDA", "TSLA", "AAPL", "MSFT", "META", "AMZN", "GOOGL", "COIN", "MSTR", "SPY", "QQQ",
  "BTC", "ETH", "SOL",
];

export function isEquity(t: string): boolean {
  return (US_EQUITIES as readonly string[]).includes(t);
}
export function isCrypto(t: string): boolean {
  return (CRYPTO as readonly string[]).includes(t);
}
