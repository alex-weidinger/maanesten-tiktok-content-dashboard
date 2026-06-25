"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Play, X } from "lucide-react";
import type { AdRow } from "@/lib/series";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
} from "@/lib/format";
import { CreativeThumb } from "./CreativeThumb";
import { StatusBadge } from "./StatusBadge";

type MetricKey = "hookRate" | "ctr" | "roas" | "engagementRate" | "conversions";

const METRICS: {
  key: MetricKey;
  label: string;
  fmt: (r: AdRow) => string;
  val: (r: AdRow) => number;
}[] = [
  { key: "hookRate", label: "Hook rate", fmt: (r) => formatPercent(r.hookRate), val: (r) => r.hookRate },
  { key: "ctr", label: "CTR", fmt: (r) => formatPercent(r.ctr), val: (r) => r.ctr },
  { key: "roas", label: "ROAS", fmt: (r) => formatRoas(r.roas), val: (r) => r.roas },
  { key: "engagementRate", label: "Engagement rate", fmt: (r) => formatPercent(r.engagementRate), val: (r) => r.engagementRate },
  { key: "conversions", label: "Conversions", fmt: (r) => formatNumber(r.conversions), val: (r) => r.conversions },
];

// Ads need enough volume to rank fairly on ratio metrics.
const MIN_IMPRESSIONS = 1000;
const TOP_N = 8;

export function TopCreatives({ rows }: { rows: AdRow[] }) {
  const [metric, setMetric] = useState<MetricKey>("roas");
  const [playing, setPlaying] = useState<{ itemId: string; name: string } | null>(null);
  const active = METRICS.find((m) => m.key === metric)!;

  const top = useMemo(() => {
    return rows
      .filter((r) => r.impressions >= MIN_IMPRESSIONS)
      .filter((r) => (metric === "roas" ? r.spend > 0 : true))
      .sort((a, b) => active.val(b) - active.val(a))
      .slice(0, TOP_N);
  }, [rows, metric, active]);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold">Top performing creatives</h2>
          <p className="text-xs text-muted">
            Best {TOP_N} by {active.label.toLowerCase()} (min. {formatNumber(MIN_IMPRESSIONS)} impressions)
          </p>
        </div>
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

      {top.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          No creatives with enough volume in this period.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {top.map((r, i) => {
            const canPlay = Boolean(r.tiktokItemId);
            return (
              <div
                key={r.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
              >
                <button
                  onClick={() => canPlay && setPlaying({ itemId: r.tiktokItemId!, name: r.name })}
                  disabled={!canPlay}
                  className="relative block w-full cursor-pointer disabled:cursor-default"
                >
                  <CreativeThumb itemId={r.tiktokItemId} name={r.name} className="aspect-[9/16] w-full" />
                  <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="absolute right-2 top-2">
                    <StatusBadge status={r.status} />
                  </span>
                  {canPlay && (
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex size-12 items-center justify-center rounded-full bg-white/90 shadow">
                        <Play className="size-5 translate-x-0.5 fill-foreground" />
                      </span>
                    </span>
                  )}
                </button>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div>
                    <p className="line-clamp-2 text-xs font-medium leading-snug" title={r.name}>
                      {r.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{r.advertiserName ?? "—"}</p>
                  </div>
                  <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    {METRICS.map((m) => (
                      <div
                        key={m.key}
                        className={clsx(
                          "flex items-center justify-between",
                          m.key === metric && "font-semibold text-foreground",
                        )}
                      >
                        <dt className="text-muted">{m.label === "Engagement rate" ? "Eng. rate" : m.label}</dt>
                        <dd className="tabular">{m.fmt(r)}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <dt className="text-muted">Spend</dt>
                      <dd className="tabular">{formatCurrency(r.spend, 0)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="relative w-full max-w-[360px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlaying(null)}
              className="absolute -top-10 right-0 flex items-center gap-1 text-sm text-white/90 hover:text-white"
            >
              <X className="size-5" /> Close
            </button>
            <div className="overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.tiktok.com/embed/v2/${playing.itemId}`}
                title={playing.name}
                className="h-[640px] w-full"
                allow="encrypted-media; fullscreen"
                frameBorder="0"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
