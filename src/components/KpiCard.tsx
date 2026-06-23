import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  /** ratio change vs previous period, e.g. 0.12 = +12%. null = no comparison. */
  delta: number | null;
  /** When true, a negative delta is good (e.g. CPA). */
  invert?: boolean;
  hint?: string;
}

export function KpiCard({ label, value, delta, invert = false, hint }: KpiCardProps) {
  const hasDelta = delta !== null && isFinite(delta);
  const positive = hasDelta && (invert ? delta < 0 : delta > 0);
  const neutral = hasDelta && delta === 0;

  return (
    <div className="card p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-muted/70" title={hint}>
            ⓘ
          </span>
        )}
      </div>
      <span className="text-2xl font-semibold tabular tracking-tight">{value}</span>
      {hasDelta ? (
        <span
          className={clsx(
            "inline-flex items-center gap-0.5 text-xs font-medium",
            neutral && "text-muted",
            !neutral && positive && "text-positive",
            !neutral && !positive && "text-negative",
          )}
        >
          {!neutral &&
            (delta > 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            ))}
          {formatPercent(Math.abs(delta), 1)}
          <span className="text-muted font-normal ml-1">vs. prev.</span>
        </span>
      ) : (
        <span className="text-xs text-muted">—</span>
      )}
    </div>
  );
}
