// Date-range presets + parsing for the dashboard's period selector.
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachDayOfInterval,
  parseISO,
  isValid,
} from "date-fns";

export type PresetKey =
  | "last7"
  | "last14"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRange {
  start: string; // YYYY-MM-DD (inclusive)
  end: string; // YYYY-MM-DD (inclusive)
  preset: PresetKey;
}

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "last7", label: "Last 7 days" },
  { key: "last14", label: "Last 14 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "thisMonth", label: "Current month" },
  { key: "lastMonth", label: "Last month" },
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Resolve a preset to concrete start/end dates relative to `today`. */
export function resolvePreset(preset: PresetKey, today = new Date()): DateRange {
  switch (preset) {
    case "last7":
      return { preset, start: iso(subDays(today, 6)), end: iso(today) };
    case "last14":
      return { preset, start: iso(subDays(today, 13)), end: iso(today) };
    case "last30":
      return { preset, start: iso(subDays(today, 29)), end: iso(today) };
    case "thisMonth":
      return { preset, start: iso(startOfMonth(today)), end: iso(today) };
    case "lastMonth": {
      const lm = subMonths(today, 1);
      return { preset, start: iso(startOfMonth(lm)), end: iso(endOfMonth(lm)) };
    }
    default:
      return { preset: "last30", start: iso(subDays(today, 29)), end: iso(today) };
  }
}

/**
 * Build a DateRange from URL search params.
 * ?preset=last7  OR  ?start=2026-01-01&end=2026-01-31 (custom)
 */
export function rangeFromParams(
  params: { preset?: string; start?: string; end?: string },
  today = new Date(),
): DateRange {
  const { preset, start, end } = params;

  if (start && end) {
    const s = parseISO(start);
    const e = parseISO(end);
    if (isValid(s) && isValid(e) && s <= e) {
      return { preset: "custom", start: iso(s), end: iso(e) };
    }
  }

  const known = PRESETS.find((p) => p.key === preset);
  if (known) return resolvePreset(known.key, today);

  return resolvePreset("last30", today);
}

/** Number of days in the range (inclusive). */
export function rangeLength(range: DateRange): number {
  return eachDayOfInterval({
    start: parseISO(range.start),
    end: parseISO(range.end),
  }).length;
}

/** Every YYYY-MM-DD in the range, for filling chart gaps. */
export function listDays(range: DateRange): string[] {
  return eachDayOfInterval({
    start: parseISO(range.start),
    end: parseISO(range.end),
  }).map(iso);
}

/** The immediately-preceding range of equal length (for trend deltas). */
export function previousRange(range: DateRange): DateRange {
  const len = rangeLength(range);
  const prevEnd = subDays(parseISO(range.start), 1);
  const prevStart = subDays(prevEnd, len - 1);
  return { preset: "custom", start: iso(prevStart), end: iso(prevEnd) };
}

export function formatRangeLabel(range: DateRange): string {
  const s = parseISO(range.start);
  const e = parseISO(range.end);
  return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
}
