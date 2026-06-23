// Builds chart-ready time series and per-ad summary rows from AdRecords.
import { listDays, type DateRange } from "./dates";
import { aggregate } from "./metrics";
import type { AdRecord, AdStatus } from "./types";

export interface SeriesPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  engagements: number;
  ctr: number; // %
  hookRate: number; // %
  roas: number;
}

/** Daily totals across all ads, with every day in the range present (zero-filled). */
export function buildTimeSeries(ads: AdRecord[], range: DateRange): SeriesPoint[] {
  const byDate = new Map<string, AdRecord["daily"]>();
  for (const day of listDays(range)) byDate.set(day, []);

  for (const ad of ads) {
    for (const d of ad.daily) {
      const arr = byDate.get(d.date);
      if (arr) arr.push(d);
    }
  }

  return listDays(range).map((date) => {
    const t = aggregate(byDate.get(date) ?? []);
    return {
      date,
      impressions: t.impressions,
      clicks: t.clicks,
      spend: +t.spend.toFixed(2),
      conversions: t.conversions,
      conversionValue: +t.conversionValue.toFixed(2),
      engagements: t.engagements,
      ctr: +(t.ctr * 100).toFixed(3),
      hookRate: +(t.hookRate * 100).toFixed(3),
      roas: +t.roas.toFixed(2),
    };
  });
}

export interface AdRow {
  id: string;
  name: string;
  campaignName: string | null;
  adGroupName: string | null;
  status: AdStatus;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  likes: number;
  comments: number;
  shares: number;
  engagements: number;
  ctr: number;
  hookRate: number;
  engagementRate: number;
  conversionRate: number;
  roas: number;
  cpa: number;
}

/** One summary row per ad, aggregated over the active range. */
export function buildAdRows(ads: AdRecord[]): AdRow[] {
  return ads.map((ad) => {
    const t = aggregate(ad.daily);
    return {
      id: ad.id,
      name: ad.name,
      campaignName: ad.campaignName,
      adGroupName: ad.adGroupName,
      status: ad.status,
      impressions: t.impressions,
      clicks: t.clicks,
      spend: t.spend,
      conversions: t.conversions,
      conversionValue: t.conversionValue,
      likes: t.likes,
      comments: t.comments,
      shares: t.shares,
      engagements: t.engagements,
      ctr: t.ctr,
      hookRate: t.hookRate,
      engagementRate: t.engagementRate,
      conversionRate: t.conversionRate,
      roas: t.roas,
      cpa: t.cpa,
    };
  });
}
