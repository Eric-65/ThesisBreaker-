"use client";

import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketSnapshot } from "@/lib/analysis/types";

// Categorical slots validated for the dark surface (#0d1117): asset, benchmark 1, benchmark 2.
const SERIES = ["#00A3B4", "#8B7CF6", "#D0702E"] as const;
// Funding is diverging around zero: positive = longs pay (cyan), negative = shorts pay (orange).
const POS = SERIES[0];
const NEG = SERIES[2];
const GRID = "rgba(255,255,255,0.06)";
const TICK = { fill: "#8B95A1", fontSize: 11, fontFamily: "var(--font-jetbrains)" };
const SURFACE = "#0d1117";

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const signed = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${fmt(n, d)}`;
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const hourFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", hour12: false, timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Card({
  title,
  note,
  children,
  summary,
  footer,
}: {
  title: string;
  note: string;
  summary: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <figure className="glass flex flex-col p-4 sm:p-5">
      <figcaption>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{note}</p>
      </figcaption>
      <div className="mt-3 h-44 w-full" aria-hidden>
        {children}
      </div>
      {footer}
      <p className="sr-only">{summary}</p>
    </figure>
  );
}

function TipBox({ title, rows }: { title: string; rows: { color?: string; label: string; value: string }[] }) {
  return (
    <div className="glass !bg-surface px-3 py-2 text-xs">
      <p className="text-muted">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="mt-0.5 flex items-center gap-2 text-ink">
          {r.color && <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: r.color }} />}
          <span>{r.label}</span>
          <span className="num ml-auto pl-3 font-semibold">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Asset vs benchmarks, each indexed to 100 at the start of the window (one shared axis). */
function RelativeChart({ market }: { market: MarketSnapshot }) {
  const c = market.candles;
  const benches = market.benchmarks ?? [];
  if (!c?.times || c.times.length !== c.closes.length || !benches.length) return null;

  const series = [
    { key: market.underlying, times: c.times, closes: c.closes },
    ...benches.map((b) => ({ key: b.underlying, times: b.times, closes: b.closes })),
  ];
  const maps = series.map((s) => new Map(s.times.map((t, i) => [t, s.closes[i]])));
  const shared = c.times.filter((t) => maps.every((m) => m.has(t)));
  if (shared.length < 2) return null;
  const base = maps.map((m) => m.get(shared[0])!);
  const data = shared.map((t) => {
    const row: Record<string, number> = { t };
    series.forEach((s, i) => (row[s.key] = (maps[i].get(t)! / base[i]) * 100));
    return row;
  });
  const last = data.at(-1)!;
  const change = (k: string) => last[k] - 100;
  const ticks = shared.filter((_, i) => i % 24 === (shared.length - 1) % 24);

  const legend = (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: SERIES[i] }} />
          <span className="text-ink/90">{s.key}</span>
          <span className={`num ${change(s.key) >= 0 ? "text-pass" : "text-block"}`}>{signed(change(s.key))}%</span>
        </li>
      ))}
    </ul>
  );

  return (
      <Card
        title={`${market.underlying} vs the market`}
        note={`Last ${shared.length}h, each indexed to 100 at the start`}
        summary={series.map((s) => `${s.key} ${signed(change(s.key))}%`).join(", ")}
        footer={legend}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 22, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" ticks={ticks} tickFormatter={(t: number) => dayFmt.format(t)} tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} tickMargin={8} />
            <YAxis domain={["auto", "auto"]} width={36} tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v, 0)} />
            <ReferenceLine y={100} stroke="rgba(255,255,255,0.18)" />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TipBox
                    title={`${hourFmt.format(Number(label))}:00 UTC`}
                    rows={series.map((s, i) => ({ color: SERIES[i], label: s.key, value: `${signed(Number(payload.find((p) => p.dataKey === s.key)?.value ?? 100) - 100)}%` }))}
                  />
                ) : null
              }
            />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={SERIES[i]}
                strokeWidth={i === 0 ? 2.5 : 2}
                dot={false}
                activeDot={{ r: 4, fill: SERIES[i], stroke: SURFACE, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
  );
}

function FundingChart({ market }: { market: MarketSnapshot }) {
  const d = market.derivatives;
  if (!d || d.fundingHistory.length < 2) return null;
  const data = d.fundingHistory.map((h) => ({ t: h.ts, rate: h.ratePct }));
  const avg = data.reduce((a, r) => a + r.rate, 0) / data.length;
  return (
    <Card
      title="Funding rate"
      note={`Last ${data.length} settlements (every ${d.fundingIntervalHours ?? 8}h). Above 0: longs pay shorts. Below 0: shorts pay longs.`}
      summary={`Current funding ${fmt(d.fundingRatePct, 4)}%, average ${fmt(avg, 4)}%`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 22, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tickFormatter={(t: number) => dayFmt.format(t)} tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} tickMargin={8} minTickGap={24} />
          <YAxis width={58} tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${fmt(v, 4)}%`} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { t: number; rate: number } | undefined;
              return active && p ? (
                <TipBox
                  title={`${hourFmt.format(p.t)}:00 UTC`}
                  rows={[{ color: p.rate >= 0 ? POS : NEG, label: p.rate >= 0 ? "Longs paid" : "Shorts paid", value: `${fmt(p.rate, 4)}%` }]}
                />
              ) : null;
            }}
          />
          <Bar dataKey="rate" maxBarSize={14} radius={[3, 3, 3, 3]} isAnimationActive={false}>
            {data.map((r) => (
              <Cell key={r.t} fill={r.rate >= 0 ? POS : NEG} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function LongShareChart({ market }: { market: MarketSnapshot }) {
  const d = market.derivatives;
  if (!d || d.longShortHistory.length < 2) return null;
  const data = d.longShortHistory.map((h) => ({ t: h.ts, long: h.positionLongPct }));
  const vals = data.map((r) => r.long);
  const lo = Math.floor(Math.min(45, ...vals) / 5) * 5;
  const hi = Math.ceil(Math.max(55, ...vals) / 5) * 5;
  const yTicks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5);
  return (
    <Card
      title="Long share of open positions"
      note={`${d.symbol} perpetual, hourly. Above 50%: more position size is long than short.`}
      summary={`Long share now ${fmt(vals.at(-1)!, 1)}%, ${data.length} hours ago ${fmt(vals[0], 1)}%`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 22, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tickFormatter={(t: number) => `${timeFmt.format(t)}`} tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} tickMargin={8} minTickGap={32} />
          <YAxis domain={[lo, hi]} ticks={yTicks} width={36} tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
          <ReferenceLine y={50} stroke="rgba(255,255,255,0.25)" strokeDasharray="0" />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { t: number; long: number } | undefined;
              return active && p ? (
                <TipBox title={`${hourFmt.format(p.t)}:00 UTC`} rows={[{ color: POS, label: "Long", value: `${fmt(p.long, 1)}%` }, { label: "Short", value: `${fmt(100 - p.long, 1)}%` }]} />
              ) : null;
            }}
          />
          <Line type="monotone" dataKey="long" stroke={POS} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: POS, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

/** Broader market and futures positioning used as evidence. Hidden for results saved before it existed. */
export function MarketContext({ market }: { market: MarketSnapshot | null }) {
  if (!market?.ticker || (!market.benchmarks?.length && !market.derivatives)) return null;
  const d = market.derivatives;
  const tiles: [string, string, string][] = d
    ? [
        ["Funding now", `${fmt(d.fundingRatePct, 4)}%`, d.fundingRatePct > 0 ? "Longs pay shorts" : d.fundingRatePct < 0 ? "Shorts pay longs" : "Balanced"],
        ["Open interest", d.openInterestUsdt !== null ? `${compact.format(d.openInterestUsdt)} USDT` : compact.format(d.openInterest), `${compact.format(d.openInterest)} contracts`],
        ["Accounts long", d.accountLongPct !== null ? `${fmt(d.accountLongPct, 1)}%` : "—", "Share of traders net long"],
      ]
    : [];

  return (
    <section aria-labelledby="context-heading">
      <h3 id="context-heading" className="flex items-center gap-2 text-sm font-semibold">
        <BarChart3 className="h-4 w-4 text-cyan" aria-hidden /> Market context
      </h3>
      <p className="mt-1 text-xs text-muted">
        Broader market and futures positioning from Bitget, used as evidence above.
        {market.derivatives === null && ` No perpetual futures contract is listed for ${market.underlying}, so positioning data is unavailable.`}
      </p>
      {tiles.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {tiles.map(([label, value, hint]) => (
            <div key={label} className="glass px-3 py-3 sm:px-4">
              <dt className="text-[11px] text-muted sm:text-xs">{label}</dt>
              <dd className="num mt-1 text-sm font-semibold text-ink sm:text-lg">{value}</dd>
              <dd className="mt-0.5 hidden text-[11px] text-muted sm:block">{hint}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <RelativeChart market={market} />
        <FundingChart market={market} />
        <LongShareChart market={market} />
      </div>
    </section>
  );
}
