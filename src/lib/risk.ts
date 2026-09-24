import type { RiskCheck, RiskGateResult, Verdict } from "./types";
import { alpaca, demoAlpaca, getAlpacaConfig } from "./alpaca";
import { getQuote, resolveIdentity } from "./market/router";
import { classifyFreshness } from "./market/types";

/** Static per-user risk configuration. Configurable in one place. */
export const RISK_CONFIG = {
  MAX_POSITION_PERCENT: 10, // no single position larger than 10% of equity
  MIN_QTY: 1,
  MAX_QTY: 10000,
  BLOCKED_STATUSES: new Set(["THESIS_TOO_FRAGILE", "REJECTED"]),
};

interface AlpacaAssetLite {
  tradable?: boolean;
  status?: string;
  symbol?: string;
}

export interface RiskGateInput {
  symbol: string;
  direction: "long" | "short";
  positionSizeUsd: number;
  verdict: Verdict;
}

async function fetchAsset(symbol: string): Promise<AlpacaAssetLite | null> {
  const cfg = getAlpacaConfig();
  if (!cfg) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${cfg.base}/v2/assets/${encodeURIComponent(symbol)}`, {
      headers: {
        "APCA-API-KEY-ID": cfg.keyId,
        "APCA-API-SECRET-KEY": cfg.secret,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as AlpacaAssetLite;
  } catch {
    return null;
  }
}

async function fetchClock(): Promise<{ is_open: boolean } | null> {
  const cfg = getAlpacaConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.base}/v2/clock`, {
      headers: {
        "APCA-API-KEY-ID": cfg.keyId,
        "APCA-API-SECRET-KEY": cfg.secret,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { is_open: boolean };
  } catch {
    return null;
  }
}

export async function runRiskGate(input: RiskGateInput): Promise<RiskGateResult> {
  const checks: RiskCheck[] = [];
  const symbol = input.symbol.toUpperCase();

  // 1. Symbol shape
  const symbolOk = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(symbol);
  checks.push({
    key: "symbol_shape",
    label: "Symbol format",
    status: symbolOk ? "PASS" : "FAIL",
    detail: symbolOk ? `Symbol ${symbol}` : "Symbol contains invalid characters.",
  });

  // 2. Position size
  const posOk = Number.isFinite(input.positionSizeUsd) && input.positionSizeUsd > 0;
  checks.push({
    key: "position_size",
    label: "Position size",
    status: posOk ? "PASS" : "FAIL",
    detail: posOk
      ? `Requested notional $${input.positionSizeUsd.toLocaleString()}`
      : "Position size must be a positive number.",
  });

  // 3. Verdict gate (deterministic, independent of LLM)
  const verdictBlocked = RISK_CONFIG.BLOCKED_STATUSES.has(input.verdict.status);
  checks.push({
    key: "thesis_status",
    label: "Thesis status",
    status: verdictBlocked
      ? "FAIL"
      : input.verdict.status === "NEEDS_MORE_EVIDENCE"
        ? "WARN"
        : "PASS",
    detail:
      input.verdict.status === "VALIDATED_FOR_PAPER_TEST"
        ? `Thesis score ${input.verdict.score}/100 — validated for paper test.`
        : input.verdict.status === "NEEDS_MORE_EVIDENCE"
          ? `Thesis score ${input.verdict.score}/100 — proceed with caution.`
          : `Thesis score ${input.verdict.score}/100 — status ${input.verdict.status.replace(/_/g, " ")}. Paper trade blocked.`,
  });

  // 4. Fetch a fresh live price through the router (Alpaca for stocks/ETFs).
  //    If no price is available we FAIL rather than fabricate — a paper
  //    trade preview must never use a made-up price.
  const identity = resolveIdentity(symbol);
  const quote = identity ? await getQuote(identity) : null;
  const price = quote?.price ?? 0;
  const priceStatus = quote
    ? classifyFreshness(quote.timestamp, quote.assetType, quote.status)
    : "UNAVAILABLE";
  const priceOk = price > 0 && priceStatus !== "UNAVAILABLE";
  checks.push({
    key: "market_price",
    label: "Live market price",
    status: priceOk ? (priceStatus === "STALE" ? "WARN" : "PASS") : "FAIL",
    detail: priceOk
      ? `Retrieved ${symbol} = $${price.toFixed(2)} from ${
          quote?.source === "ALPACA_STOCK" ? "Alpaca" : quote?.source ?? "provider"
        } · status ${priceStatus} · updated ${new Date(quote!.timestamp).toISOString()}.`
      : `No live price available for ${symbol}. Refusing to preview a paper order with a fabricated price.`,
  });

  const quantity = priceOk
    ? Math.max(RISK_CONFIG.MIN_QTY, Math.floor((input.positionSizeUsd || 0) / price))
    : 0;
  const notional = quantity * price;

  // 5. Quantity bounds
  const qtyOk = quantity >= RISK_CONFIG.MIN_QTY && quantity <= RISK_CONFIG.MAX_QTY;
  checks.push({
    key: "quantity",
    label: "Quantity",
    status: qtyOk ? "PASS" : "FAIL",
    detail: qtyOk
      ? `${quantity} share${quantity === 1 ? "" : "s"} at ~$${price.toFixed(2)}`
      : priceOk
        ? `Computed quantity ${quantity} is outside [${RISK_CONFIG.MIN_QTY}, ${RISK_CONFIG.MAX_QTY}].`
        : "Cannot size a position without a live market price.",
  });

  // 6. Asset tradability (best-effort)
  let assetOk = true;
  let assetDetail = "Assumed tradable (demo mode).";
  const asset = await fetchAsset(symbol);
  if (asset) {
    assetOk = !!asset.tradable && asset.status !== "inactive";
    assetDetail = assetOk
      ? `Alpaca reports ${symbol} tradable.`
      : `Alpaca reports ${symbol} not currently tradable.`;
  }
  checks.push({
    key: "asset_tradable",
    label: "Asset tradable",
    status: assetOk ? "PASS" : "FAIL",
    detail: assetDetail,
  });

  // 7. Market clock (best-effort — allows queue outside RTH)
  const clock = await fetchClock();
  if (clock) {
    checks.push({
      key: "market_clock",
      label: "Market status",
      status: clock.is_open ? "PASS" : "WARN",
      detail: clock.is_open ? "Market is open." : "Market is currently closed. Order will queue.",
    });
  } else {
    checks.push({
      key: "market_clock",
      label: "Market status",
      status: "WARN",
      detail: "Live market status unavailable — using demo mode.",
    });
  }

  // 8. Buying power (live or demo)
  let buyingPower = 100000;
  let bpOk = true;
  try {
    if (getAlpacaConfig()) {
      const acct = await alpaca.getAccount();
      buyingPower = Number(acct.buying_power);
    } else {
      buyingPower = Number(demoAlpaca.account().buying_power);
    }
  } catch {
    buyingPower = Number(demoAlpaca.account().buying_power);
  }
  bpOk = notional <= buyingPower;
  checks.push({
    key: "buying_power",
    label: "Buying power",
    status: bpOk ? "PASS" : "FAIL",
    detail: bpOk
      ? `$${buyingPower.toLocaleString()} available.`
      : `Notional $${notional.toFixed(2)} exceeds buying power $${buyingPower.toLocaleString()}.`,
  });

  // 9. Concentration
  const maxNotional = buyingPower * (RISK_CONFIG.MAX_POSITION_PERCENT / 100);
  const concOk = notional <= maxNotional;
  checks.push({
    key: "concentration",
    label: `Position ≤ ${RISK_CONFIG.MAX_POSITION_PERCENT}% of equity`,
    status: concOk ? "PASS" : "FAIL",
    detail: concOk
      ? `Notional $${notional.toFixed(2)} within concentration cap of $${maxNotional.toFixed(0)}.`
      : `Requested position exceeds your configured ${RISK_CONFIG.MAX_POSITION_PERCENT}% position-size limit ($${maxNotional.toFixed(0)}).`,
  });

  const failing = checks.filter((c) => c.status === "FAIL");
  const ok = failing.length === 0;

  return {
    ok,
    checks,
    blockedReason: failing[0]?.detail,
    estimatedPrice: price,
    quantity,
    estimatedNotional: notional,
    buyingPower,
    maxPositionPercent: RISK_CONFIG.MAX_POSITION_PERCENT,
    maxNotional,
  };
}
