"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface GrowthPoint {
  date: string; // YYYY-MM-DD (UTC)
  users: number; // cumulative
  analyses: number; // that day
}

// One series per chart, so one mark color: the design system's deep cyan
// (inside the dark-surface lightness band). Text stays in ink/muted tokens.
const MARK = "#00A3B4";
const GRID = "rgba(255,255,255,0.06)";
const TICK = { fill: "#8B95A1", fontSize: 11, fontFamily: "var(--font-jetbrains)" };

const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);
const num = (v: number) => v.toLocaleString("en-US");

function Tip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { value: number; payload: GrowthPoint }[];
  unit: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="glass !bg-surface px-3 py-2 text-xs">
      <p className="text-muted">{long.format(asDate(p.payload.date))}</p>
      <p className="mt-0.5 text-ink">
        <span className="num text-sm font-semibold">{num(p.value)}</span> {unit(p.value)}
      </p>
    </div>
  );
}

function Frame({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <figure className="glass p-5">
      <figcaption>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{note}</p>
      </figcaption>
      <div className="mt-4 h-52 w-full">{children}</div>
    </figure>
  );
}

/**
 * Two measures on different scales → two small charts sharing one time axis
 * (never a dual-axis chart). Each has a hover tooltip; a table view follows.
 */
export function GrowthCharts({ data }: { data: GrowthPoint[] }) {
  const ticks = data.filter((_, i) => i % 7 === (data.length - 1) % 7).map((d) => d.date);
  const xAxis = (
    <XAxis
      dataKey="date"
      ticks={ticks}
      tickFormatter={(d: string) => short.format(asDate(d))}
      tick={TICK}
      axisLine={{ stroke: GRID }}
      tickLine={false}
      tickMargin={8}
    />
  );
  const yAxis = <YAxis allowDecimals={false} width={40} tick={TICK} axisLine={false} tickLine={false} tickFormatter={num} />;
  const grid = <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />;
  const margin = { top: 6, right: 24, bottom: 0, left: 0 };

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Frame title="Total users" note="Cumulative, last 30 days (UTC)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={margin}>
              {grid}
              {xAxis}
              {yAxis}
              <Tooltip
                content={<Tip unit={(v) => (v === 1 ? "user in total" : "users in total")} />}
                cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke={MARK}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill={MARK}
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 4, fill: MARK, stroke: "#0d1117", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Frame>
        <Frame title="Stress tests per day" note="Completed analyses, last 30 days (UTC)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={margin} barCategoryGap={2}>
              {grid}
              {xAxis}
              {yAxis}
              <Tooltip
                content={<Tip unit={(v) => (v === 1 ? "stress test" : "stress tests")} />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey="analyses" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Frame>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">View these 30 days as a table</summary>
        <div className="glass mt-3 max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Day (UTC)</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Total users</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Stress tests that day</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <th scope="row" className="px-4 py-1.5 font-normal text-ink/90">{long.format(asDate(d.date))}</th>
                  <td className="num px-4 py-1.5 text-right">{num(d.users)}</td>
                  <td className="num px-4 py-1.5 text-right">{num(d.analyses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
