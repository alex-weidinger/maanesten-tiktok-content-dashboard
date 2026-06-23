"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { SeriesPoint } from "@/lib/series";
import { formatCompact, formatCurrency, formatNumber } from "@/lib/format";

type MetricKey = keyof Omit<SeriesPoint, "date">;

const METRICS: {
  key: MetricKey;
  label: string;
  fmt: (n: number) => string;
  axis: (n: number) => string;
}[] = [
  { key: "spend", label: "Spend", fmt: (n) => formatCurrency(n), axis: (n) => formatCompact(n) },
  { key: "conversionValue", label: "Revenue", fmt: (n) => formatCurrency(n), axis: (n) => formatCompact(n) },
  { key: "roas", label: "ROAS", fmt: (n) => `${n.toFixed(2)}×`, axis: (n) => `${n.toFixed(1)}×` },
  { key: "conversions", label: "Conversions", fmt: (n) => formatNumber(n), axis: (n) => formatCompact(n) },
  { key: "impressions", label: "Impressions", fmt: (n) => formatNumber(n), axis: (n) => formatCompact(n) },
  { key: "clicks", label: "Clicks", fmt: (n) => formatNumber(n), axis: (n) => formatCompact(n) },
  { key: "ctr", label: "CTR", fmt: (n) => `${n.toFixed(2)}%`, axis: (n) => `${n.toFixed(1)}%` },
  { key: "hookRate", label: "Hook rate", fmt: (n) => `${n.toFixed(2)}%`, axis: (n) => `${n.toFixed(1)}%` },
  { key: "engagements", label: "Engagements", fmt: (n) => formatNumber(n), axis: (n) => formatCompact(n) },
];

export function TrendChart({ data }: { data: SeriesPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("spend");
  const active = METRICS.find((m) => m.key === metric)!;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold">Performance over time</h2>
        <div className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={clsx(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                metric === m.key
                  ? "bg-foreground text-white"
                  : "text-muted hover:bg-surface-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(parseISO(d), "MMM d")}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={active.axis}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                fontSize: 12,
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
              labelFormatter={(d) => format(parseISO(d as string), "EEE, MMM d, yyyy")}
              formatter={(value) => [active.fmt(Number(value)), active.label]}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#fillMetric)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
