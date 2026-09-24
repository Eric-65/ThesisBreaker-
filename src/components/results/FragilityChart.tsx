"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Assumption } from "@/lib/analysis/types";
import { CATEGORY_LABEL, STATUS_META } from "./meta";

interface Row {
  id: string;
  fragility: number;
  a: Assumption;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const { a } = payload[0].payload;
  const s = STATUS_META[a.status];
  return (
    <div className="glass max-w-[260px] p-3 text-xs">
      <p className="num text-muted">
        {a.id} · {CATEGORY_LABEL[a.category]}
      </p>
      <p className="mt-1 text-ink">{a.text}</p>
      <p className="mt-2">
        <span className="num text-ink">{a.fragility}</span>
        <span className="text-muted">/100 · </span>
        <span className={s.text}>{s.label}</span>
      </p>
    </div>
  );
}

/** Magnitude per assumption → horizontal bars, colored by status (with legend text). */
export function FragilityChart({ assumptions, weakestId }: { assumptions: Assumption[]; weakestId: string }) {
  const data: Row[] = assumptions.map((a) => ({ id: a.id, fragility: a.fragility, a }));
  return (
    <figure>
      <div style={{ height: 36 * data.length + 36 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }} barCategoryGap={10}>
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 40, 70, 100]}
              tick={{ fill: "#8B95A1", fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="id"
              width={36}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={11}
                  fontFamily="var(--font-jetbrains)"
                  fill={payload.value === weakestId ? "#00E0F0" : "#8B95A1"}
                >
                  {payload.value}
                </text>
              )}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={40} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" />
            <ReferenceLine x={70} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" />
            <Tooltip cursor={{ fill: "rgba(0,224,240,0.06)" }} content={<ChartTooltip />} />
            <Bar dataKey="fragility" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive animationDuration={900}>
              {data.map((d) => (
                <Cell key={d.id} fill={STATUS_META[d.a.status].color} fillOpacity={d.id === weakestId ? 1 : 0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {(["holds", "weak", "broken"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: STATUS_META[s].color }} aria-hidden />
            {STATUS_META[s].label}
          </span>
        ))}
        <span>· dashed lines at 40 (weak) and 70 (broken)</span>
      </figcaption>
    </figure>
  );
}
