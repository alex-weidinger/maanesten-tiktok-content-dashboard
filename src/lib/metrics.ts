// Metric definitions + aggregation. This is the single source of truth for
// how CTR, hook rate, ROAS, etc. are computed from raw daily rows.
import type { AdRecord, AdStatus, DailyMetric, MetricTotals } from "./types";

const HOOK_BASIS = (process.env.HOOK_RATE_BASIS === "video6s"
  ? "video6s"
  : "video2s") as "video2s" | "video6s";

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Sum an array of daily rows and compute all derived ratios. */
export function aggregate(daily: DailyMetric[]): MetricTotals {
  const t = daily.reduce(
    (acc, d) => {
      acc.impressions += d.impressions;
      acc.clicks += d.clicks;
      acc.spend += d.spend;
      acc.conversions += d.conversions;
      acc.conversionValue += d.conversionValue;
      acc.videoViews += d.videoViews;
      acc.video2s += d.video2s;
      acc.video6s += d.video6s;
      acc.videoP100 += d.videoP100;
      acc.likes += d.likes;
      acc.comments += d.comments;
      acc.shares += d.shares;
      acc.follows += d.follows;
      acc.profileVisits += d.profileVisits;
      return acc;
    },
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      conversionValue: 0,
      videoViews: 0,
      video2s: 0,
      video6s: 0,
      videoP100: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      follows: 0,
      profileVisits: 0,
    },
  );

  const engagements = t.likes + t.comments + t.shares;
  const hookNumerator = HOOK_BASIS === "video6s" ? t.video6s : t.video2s;

  return {
    ...t,
    engagements,
    ctr: safeDiv(t.clicks, t.impressions),
    hookRate: safeDiv(hookNumerator, t.impressions),
    holdRate: safeDiv(t.videoP100, t.impressions),
    engagementRate: safeDiv(engagements, t.impressions),
    conversionRate: safeDiv(t.conversions, t.clicks),
    roas: safeDiv(t.conversionValue, t.spend),
    cpa: safeDiv(t.spend, t.conversions),
    cpm: safeDiv(t.spend, t.impressions) * 1000,
    cpc: safeDiv(t.spend, t.clicks),
  };
}

/** Aggregate across many ads at once. */
export function aggregateAds(ads: AdRecord[]): MetricTotals {
  return aggregate(ads.flatMap((a) => a.daily));
}

/** Percentage change between two values, as a ratio (0.1 = +10%). null if no base. */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export const HOOK_RATE_BASIS = HOOK_BASIS;

/**
 * Normalise TikTok status fields into one of three UI buckets.
 *  - live:     enabled AND delivering
 *  - paused:   enabled but not currently delivering (user paused / under review)
 *  - disabled: turned off / rejected / deleted
 */
export function deriveStatus(
  operationStatus: string | null | undefined,
  secondaryStatus: string | null | undefined,
): AdStatus {
  const op = (operationStatus || "").toUpperCase();
  const sec = (secondaryStatus || "").toUpperCase();

  if (op === "DISABLE") return "paused";

  // Delivery-blocking secondary states => disabled
  if (
    sec.includes("DELETE") ||
    sec.includes("REJECT") ||
    sec.includes("NOT_APPROVED") ||
    sec.includes("DISABLE")
  ) {
    return "disabled";
  }

  if (sec.includes("DELIVERY_OK") || sec === "AD_STATUS_DELIVERY_OK" || op === "ENABLE") {
    // Enabled & not blocked. If TikTok reports a non-delivering reason, treat as paused.
    if (sec.includes("NOT_START") || sec.includes("NO_BUDGET") || sec.includes("AUDIT")) {
      return "paused";
    }
    return "live";
  }

  return "paused";
}

export const STATUS_LABEL: Record<AdStatus, string> = {
  live: "Live",
  paused: "Paused",
  disabled: "Disabled",
};
