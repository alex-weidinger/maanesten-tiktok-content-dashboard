// Shared domain types used across the data layer, metrics, and UI.

/** Raw daily metrics for a single ad on a single day (DB-shape, source-agnostic). */
export interface DailyMetric {
  date: string; // YYYY-MM-DD
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  videoViews: number;
  video2s: number;
  video6s: number;
  videoP25: number;
  videoP50: number;
  videoP75: number;
  videoP100: number;
  likes: number;
  comments: number;
  shares: number;
  follows: number;
  profileVisits: number;
}

/** Delivery status normalised into three buckets for the UI badges. */
export type AdStatus = "live" | "paused" | "disabled";

/** An ad with its per-day metrics already filtered to the active date range. */
export interface AdRecord {
  id: string;
  name: string;
  advertiserId: string | null;
  advertiserName: string | null; // market label, e.g. "Maanesten DK"
  campaignName: string | null;
  adGroupName: string | null;
  operationStatus: string | null;
  secondaryStatus: string | null;
  thumbnailUrl: string | null;
  status: AdStatus;
  daily: DailyMetric[];
}

/** Aggregated totals over a date range (per ad or across all ads). */
export interface MetricTotals {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  videoViews: number;
  video2s: number;
  video6s: number;
  videoP100: number;
  likes: number;
  comments: number;
  shares: number;
  follows: number;
  profileVisits: number;
  // Derived
  ctr: number; // clicks / impressions
  hookRate: number; // (video2s | video6s) / impressions
  holdRate: number; // videoP100 / impressions
  engagementRate: number; // (likes + comments + shares) / impressions
  conversionRate: number; // conversions / clicks
  roas: number; // conversionValue / spend
  cpa: number; // spend / conversions
  cpm: number; // spend / impressions * 1000
  cpc: number; // spend / clicks
  engagements: number; // likes + comments + shares
}

export interface SyncStatus {
  ranAt: string | null;
  status: string | null;
  source: string | null;
}
