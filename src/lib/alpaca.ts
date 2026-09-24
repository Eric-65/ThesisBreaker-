// Alpaca service layer. Server-side only. Never expose the secret key to the client.

const PAPER_BASE = "https://paper-api.alpaca.markets";

export interface AlpacaConfig {
  keyId: string;
  secret: string;
  base: string;
}

export function getAlpacaConfig(): AlpacaConfig | null {
  const keyId = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!keyId || !secret) return null;
  return { keyId, secret, base: PAPER_BASE };
}

export function isAlpacaConfigured(): boolean {
  return !!getAlpacaConfig();
}

async function alpacaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cfg = getAlpacaConfig();
  if (!cfg) throw new Error("Alpaca is not configured");
  const res = await fetch(`${cfg.base}${path}`, {
    ...init,
    headers: {
      "APCA-API-KEY-ID": cfg.keyId,
      "APCA-API-SECRET-KEY": cfg.secret,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alpaca ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export interface AlpacaAccount {
  equity: string;
  buying_power: string;
  cash: string;
  status: string;
  currency: string;
  portfolio_value: string;
  daytrade_count: number;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  qty: string;
  side: string;
  type: string;
  status: string;
  filled_qty: string;
  submitted_at: string;
  filled_avg_price?: string;
}

export interface PortfolioHistory {
  timestamp: number[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
  base_value: number;
  timeframe: string;
}

export const alpaca = {
  async getAccount(): Promise<AlpacaAccount> {
    return alpacaFetch<AlpacaAccount>("/v2/account");
  },
  async getPositions(): Promise<AlpacaPosition[]> {
    return alpacaFetch<AlpacaPosition[]>("/v2/positions");
  },
  async getOrders(): Promise<AlpacaOrder[]> {
    return alpacaFetch<AlpacaOrder[]>("/v2/orders?status=all&limit=50");
  },
  async getPortfolioHistory(): Promise<PortfolioHistory> {
    return alpacaFetch<PortfolioHistory>("/v2/account/portfolio/history?period=1M&timeframe=1D");
  },
  async placeOrder(params: {
    symbol: string;
    qty: number;
    side: "buy" | "sell";
    type?: "market" | "limit";
    time_in_force?: "day" | "gtc";
    client_order_id: string;
    limit_price?: number;
  }): Promise<AlpacaOrder> {
    return alpacaFetch<AlpacaOrder>("/v2/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: params.symbol,
        qty: params.qty,
        side: params.side,
        type: params.type ?? "market",
        time_in_force: params.time_in_force ?? "day",
        client_order_id: params.client_order_id,
        ...(params.limit_price ? { limit_price: params.limit_price } : {}),
      }),
    });
  },
};

// Demo data helpers used when Alpaca isn't configured — clearly labeled as DEMO in UI.
export const demoAlpaca = {
  account: (): AlpacaAccount => ({
    equity: "100523.42",
    buying_power: "97231.10",
    cash: "24518.02",
    status: "ACTIVE",
    currency: "USD",
    portfolio_value: "100523.42",
    daytrade_count: 0,
  }),
  positions: (): AlpacaPosition[] => [
    {
      symbol: "NVDA",
      qty: "12",
      avg_entry_price: "118.42",
      current_price: "127.83",
      market_value: "1533.96",
      unrealized_pl: "112.92",
      unrealized_plpc: "0.0794",
      side: "long",
    },
    {
      symbol: "AAPL",
      qty: "8",
      avg_entry_price: "224.10",
      current_price: "231.55",
      market_value: "1852.40",
      unrealized_pl: "59.60",
      unrealized_plpc: "0.0333",
      side: "long",
    },
    {
      symbol: "TSLA",
      qty: "-5",
      avg_entry_price: "252.30",
      current_price: "243.10",
      market_value: "-1215.50",
      unrealized_pl: "46.00",
      unrealized_plpc: "0.0365",
      side: "short",
    },
  ],
  orders: (): AlpacaOrder[] => [
    {
      id: "demo-1",
      client_order_id: "demo-uuid-1",
      symbol: "NVDA",
      qty: "12",
      side: "buy",
      type: "market",
      status: "filled",
      filled_qty: "12",
      submitted_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      filled_avg_price: "118.42",
    },
    {
      id: "demo-2",
      client_order_id: "demo-uuid-2",
      symbol: "AAPL",
      qty: "8",
      side: "buy",
      type: "market",
      status: "filled",
      filled_qty: "8",
      submitted_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      filled_avg_price: "224.10",
    },
    {
      id: "demo-3",
      client_order_id: "demo-uuid-3",
      symbol: "TSLA",
      qty: "5",
      side: "sell",
      type: "market",
      status: "filled",
      filled_qty: "5",
      submitted_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      filled_avg_price: "252.30",
    },
    {
      id: "demo-4",
      client_order_id: "demo-uuid-4",
      symbol: "AMD",
      qty: "10",
      side: "buy",
      type: "limit",
      status: "pending",
      filled_qty: "0",
      submitted_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ],
  portfolioHistory: (): PortfolioHistory => {
    const n = 30;
    const ts: number[] = [];
    const eq: number[] = [];
    const pl: number[] = [];
    const plpc: number[] = [];
    let base = 100000;
    for (let i = 0; i < n; i++) {
      const day = Date.now() - (n - i) * 24 * 3600 * 1000;
      ts.push(Math.floor(day / 1000));
      const change = Math.sin(i / 3) * 500 + i * 20 + (Math.random() - 0.5) * 300;
      const val = 100000 + change;
      base = 100000;
      eq.push(Number(val.toFixed(2)));
      pl.push(Number((val - base).toFixed(2)));
      plpc.push(Number(((val - base) / base).toFixed(4)));
    }
    return {
      timestamp: ts,
      equity: eq,
      profit_loss: pl,
      profit_loss_pct: plpc,
      base_value: 100000,
      timeframe: "1D",
    };
  },
};
