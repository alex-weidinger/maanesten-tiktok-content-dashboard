// Number / currency / percentage formatting helpers used by the UI.

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

export function formatNumber(n: number, maximumFractionDigits = 0): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(n);
}

/** Compact form for large counts, e.g. 1.2M, 34.5K. */
export function formatCompact(n: number): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatCurrency(n: number, maximumFractionDigits = 2): string {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits,
  }).format(n);
}

/** Takes a ratio (0–1) and renders as a percentage. */
export function formatPercent(ratio: number, fractionDigits = 2): string {
  if (!isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

/** ROAS as a multiplier, e.g. 3.4×. */
export function formatRoas(n: number): string {
  if (!isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2)}×`;
}
