"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { AdRow } from "@/lib/series";
import type { AdStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
} from "@/lib/format";

type SortKey =
  | "name"
  | "status"
  | "impressions"
  | "ctr"
  | "hookRate"
  | "engagementRate"
  | "engagements"
  | "conversions"
  | "conversionRate"
  | "spend"
  | "roas";

const STATUS_ORDER: Record<AdStatus, number> = { live: 0, paused: 1, disabled: 2 };

const COLUMNS: { key: SortKey; label: string; align: "left" | "right"; hint?: string }[] = [
  { key: "name", label: "Ad / Content", align: "left" },
  { key: "status", label: "Status", align: "left" },
  { key: "impressions", label: "Impr.", align: "right" },
  { key: "ctr", label: "CTR", align: "right" },
  { key: "hookRate", label: "Hook rate", align: "right" },
  { key: "engagements", label: "Engagement", align: "right", hint: "Likes + comments + shares" },
  { key: "engagementRate", label: "Eng. rate", align: "right" },
  { key: "conversions", label: "Conv.", align: "right" },
  { key: "conversionRate", label: "CVR", align: "right" },
  { key: "spend", label: "Spend", align: "right" },
  { key: "roas", label: "ROAS", align: "right" },
];

const FILTERS: { key: AdStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "paused", label: "Paused" },
  { key: "disabled", label: "Disabled" },
];

const ROW_LIMIT = 100;

export function AdTable({ rows }: { rows: AdRow[] }) {
  const [sort, setSort] = useState<SortKey>("spend");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<AdStatus | "all">("all");

  const counts = useMemo(() => {
    const c = { all: rows.length, live: 0, paused: 0, disabled: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
    const sorted = [...filtered].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sort === "name") {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      } else if (sort === "status") {
        av = STATUS_ORDER[a.status];
        bv = STATUS_ORDER[b.status];
      } else {
        av = a[sort];
        bv = b[sort];
      }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, filter, sort, dir]);

  const shown = visible.slice(0, ROW_LIMIT);

  function toggleSort(key: SortKey) {
    if (key === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <h2 className="text-sm font-semibold">Ad & content performance</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-foreground text-white"
                  : "text-muted hover:bg-surface-muted",
              )}
            >
              {f.label}
              <span className="ml-1 opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted border-b border-border bg-surface-muted/40">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    "px-3 py-2.5 font-medium whitespace-nowrap select-none",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  <button
                    onClick={() => toggleSort(col.key)}
                    className={clsx(
                      "inline-flex items-center gap-1 hover:text-foreground transition-colors",
                      col.align === "right" && "flex-row-reverse",
                    )}
                    title={col.hint}
                  >
                    {col.label}
                    {sort === col.key ? (
                      dir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                className={clsx(
                  "border-b border-border last:border-0 hover:bg-surface-muted/40 transition-colors",
                  r.status === "disabled" && "opacity-60",
                )}
              >
                <td className="px-3 py-3 max-w-[260px]">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted truncate">
                    {[r.advertiserName, r.campaignName, r.adGroupName]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3 text-right tabular">{formatNumber(r.impressions)}</td>
                <td className="px-3 py-3 text-right tabular">{formatPercent(r.ctr)}</td>
                <td className="px-3 py-3 text-right tabular">{formatPercent(r.hookRate)}</td>
                <td className="px-3 py-3 text-right tabular">{formatNumber(r.engagements)}</td>
                <td className="px-3 py-3 text-right tabular">{formatPercent(r.engagementRate)}</td>
                <td className="px-3 py-3 text-right tabular">{formatNumber(r.conversions)}</td>
                <td className="px-3 py-3 text-right tabular">{formatPercent(r.conversionRate)}</td>
                <td className="px-3 py-3 text-right tabular">{formatCurrency(r.spend)}</td>
                <td className="px-3 py-3 text-right tabular font-medium">
                  {formatRoas(r.roas)}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-muted">
                  No ads match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visible.length > ROW_LIMIT && (
        <div className="border-t border-border px-4 py-2.5 text-xs text-muted">
          Showing top {ROW_LIMIT} of {visible.length.toLocaleString()} ads (sorted by{" "}
          {sort}). Use the market and status filters to narrow the list.
        </div>
      )}
    </div>
  );
}
