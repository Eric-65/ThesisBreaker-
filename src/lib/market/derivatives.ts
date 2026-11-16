import "server-only";
import { z } from "zod";
import type { DerivativesSnapshot } from "@/lib/analysis/types";
import { cached, request } from "./bitget";
import { MarketDataError } from "./provider";

/**
 * Bitget USDT-margined perpetual futures, public REST API v2 (no key):
 *   GET /api/v2/mix/market/ticker?symbol=SOLUSDT&productType=usdt-futures
 *   GET /api/v2/mix/market/history-fund-rate?symbol=…&productType=usdt-futures&pageSize=21
 *   GET /api/v2/mix/market/current-fund-rate?symbol=…&productType=usdt-futures
 *   GET /api/v2/mix/market/position-long-short?symbol=…&period=1h
 *   GET /api/v2/mix/market/account-long-short?symbol=…&period=1h
 * Positioning data shows how other traders are leaning: who pays funding,
 * how much is open, and whether positions/accounts are mostly long or short.
 */
const PRODUCT = "usdt-futures";
const num = z.union([z.string(), z.number()]).transform((v) => Number(v));

const FuturesTicker = z.object({
  symbol: z.string(),
  lastPr: num,
  markPrice: num.optional(),
  fundingRate: num,
  holdingAmount: num,
});
const CurrentFunding = z.object({ fundingRateInterval: num.optional() });
const FundingRow = z.object({ fundingRate: num, fundingTime: num });
const PositionRow = z.object({ longPositionRatio: num, ts: num });
const AccountRow = z.object({ longAccountRatio: num, ts: num });

const pct = (fraction: number) => fraction * 100;

/** Positioning for `${underlying}USDT` perpetual. Null when Bitget lists no such contract. */
export async function getDerivativesSnapshot(underlying: string): Promise<DerivativesSnapshot | null> {
  const symbol = `${underlying}USDT`;
  return cached(`d:${symbol}`, 60_000, async () => {
    let ticker: z.infer<typeof FuturesTicker>;
    try {
      const rows = z.array(FuturesTicker).safeParse(
        await request("/api/v2/mix/market/ticker", { symbol, productType: PRODUCT }),
      );
      const row = rows.success ? rows.data.find((r) => r.symbol === symbol) : undefined;
      if (!row) return null;
      ticker = row;
    } catch (err) {
      // "Parameter XYZUSDT does not exist" → no perpetual for this asset.
      if (err instanceof MarketDataError && err.code === "api") return null;
      throw err;
    }

    // The rest is optional context: a failure leaves that piece empty.
    const [interval, history, positions, accounts] = await Promise.allSettled([
      request("/api/v2/mix/market/current-fund-rate", { symbol, productType: PRODUCT }),
      request("/api/v2/mix/market/history-fund-rate", { symbol, productType: PRODUCT, pageSize: 21 }),
      request("/api/v2/mix/market/position-long-short", { symbol, period: "1h" }),
      request("/api/v2/mix/market/account-long-short", { symbol, period: "1h" }),
    ]);
    const ok = <T,>(r: PromiseSettledResult<unknown>, schema: z.ZodType<T>): T | null => {
      if (r.status !== "fulfilled") return null;
      const parsed = schema.safeParse(r.value);
      return parsed.success ? parsed.data : null;
    };

    const fundingHistory = (ok(history, z.array(FundingRow)) ?? [])
      .map((r) => ({ ts: r.fundingTime, ratePct: pct(r.fundingRate) }))
      .filter((r) => Number.isFinite(r.ratePct))
      .sort((a, b) => a.ts - b.ts);
    const positionRows = (ok(positions, z.array(PositionRow)) ?? []).sort((a, b) => a.ts - b.ts);
    const accountRows = (ok(accounts, z.array(AccountRow)) ?? []).sort((a, b) => a.ts - b.ts);
    const price = ticker.markPrice ?? ticker.lastPr;

    return {
      symbol,
      fundingRatePct: pct(ticker.fundingRate),
      fundingIntervalHours: ok(interval, z.array(CurrentFunding))?.[0]?.fundingRateInterval ?? null,
      fundingHistory,
      openInterest: ticker.holdingAmount,
      openInterestUsdt: Number.isFinite(price) ? ticker.holdingAmount * price : null,
      positionLongPct: positionRows.length ? pct(positionRows.at(-1)!.longPositionRatio) : null,
      accountLongPct: accountRows.length ? pct(accountRows.at(-1)!.longAccountRatio) : null,
      longShortHistory: positionRows.map((r) => ({ ts: r.ts, positionLongPct: pct(r.longPositionRatio) })),
    };
  });
}
