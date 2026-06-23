"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Calendar } from "lucide-react";
import { PRESETS, type DateRange } from "@/lib/dates";

export function PeriodSelector({ range }: { range: DateRange }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(range.preset === "custom");
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);

  function applyPreset(preset: string) {
    const next = new URLSearchParams(params.toString());
    next.set("preset", preset);
    next.delete("start");
    next.delete("end");
    setCustomOpen(false);
    startTransition(() => router.push(`/?${next.toString()}`));
  }

  function applyCustom() {
    if (!start || !end || start > end) return;
    const next = new URLSearchParams(params.toString());
    next.delete("preset");
    next.set("start", start);
    next.set("end", end);
    startTransition(() => router.push(`/?${next.toString()}`));
  }

  return (
    <div className={clsx("flex flex-wrap items-center gap-1.5", isPending && "opacity-60")}>
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key)}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            range.preset === p.key
              ? "bg-foreground text-white"
              : "bg-surface text-foreground hover:bg-surface-muted border border-border",
          )}
        >
          {p.label}
        </button>
      ))}

      <button
        onClick={() => setCustomOpen((v) => !v)}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors",
          range.preset === "custom"
            ? "bg-foreground text-white border-foreground"
            : "bg-surface text-foreground hover:bg-surface-muted border-border",
        )}
      >
        <Calendar className="size-4" />
        Custom
      </button>

      {customOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5">
          <input
            type="date"
            value={start}
            max={end}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md bg-surface-muted px-2 py-1 text-sm tabular outline-none"
          />
          <span className="text-muted text-sm">→</span>
          <input
            type="date"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-md bg-surface-muted px-2 py-1 text-sm tabular outline-none"
          />
          <button
            onClick={applyCustom}
            className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-white hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
