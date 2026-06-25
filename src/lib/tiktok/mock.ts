// Deterministic mock data so the dashboard is fully functional before the
// TikTok developer app is live. Same seed → same numbers on every reload.
import { listDays, type DateRange } from "../dates";
import { deriveStatus } from "../metrics";
import { MAANESTEN_MARKETS } from "../accounts";
import type { AdRecord, DailyMetric } from "../types";

// Tiny deterministic PRNG (mulberry32) seeded from a string.
function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function rng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MockAdDef {
  id: string;
  name: string;
  campaignName: string;
  adGroupName: string;
  operationStatus: "ENABLE" | "DISABLE";
  secondaryStatus: string;
  quality: number; // 0.6–1.4 multiplier on performance
}

const MOCK_ADS: MockAdDef[] = [
  { id: "ad_1001", name: "UGC – Morning Routine Hook", campaignName: "Q2 Prospecting", adGroupName: "Broad 18-34", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_DELIVERY_OK", quality: 1.35 },
  { id: "ad_1002", name: "Founder Story – 30s", campaignName: "Q2 Prospecting", adGroupName: "Broad 18-34", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_DELIVERY_OK", quality: 1.1 },
  { id: "ad_1003", name: "Product Demo – Close-up", campaignName: "Q2 Prospecting", adGroupName: "Interest: Skincare", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_DELIVERY_OK", quality: 0.95 },
  { id: "ad_1004", name: "Before / After Transition", campaignName: "Q2 Prospecting", adGroupName: "Interest: Skincare", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_NOT_START", quality: 1.2 },
  { id: "ad_1005", name: "Testimonial Compilation", campaignName: "Q2 Retargeting", adGroupName: "Site Visitors 30d", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_DELIVERY_OK", quality: 1.25 },
  { id: "ad_1006", name: "Limited Offer – Countdown", campaignName: "Q2 Retargeting", adGroupName: "Add-to-Cart 14d", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_DELIVERY_OK", quality: 1.4 },
  { id: "ad_1007", name: "Unboxing ASMR", campaignName: "Q2 Prospecting", adGroupName: "Broad 18-34", operationStatus: "DISABLE", secondaryStatus: "AD_STATUS_DISABLE", quality: 0.8 },
  { id: "ad_1008", name: "Trend Audio – Dance", campaignName: "Q2 Prospecting", adGroupName: "Interest: Fashion", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_DELIVERY_OK", quality: 0.9 },
  { id: "ad_1009", name: "Problem / Solution – 15s", campaignName: "Q2 Prospecting", adGroupName: "Interest: Fashion", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_DELIVERY_OK", quality: 1.05 },
  { id: "ad_1010", name: "Creator Duet Review", campaignName: "Q2 Retargeting", adGroupName: "Site Visitors 30d", operationStatus: "DISABLE", secondaryStatus: "AD_STATUS_DISABLE", quality: 0.7 },
  { id: "ad_1011", name: "Static Carousel – Bestsellers", campaignName: "Q2 Retargeting", adGroupName: "Add-to-Cart 14d", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_AUDIT", quality: 0.85 },
  { id: "ad_1012", name: "Behind the Scenes", campaignName: "Q2 Prospecting", adGroupName: "Broad 18-34", operationStatus: "ENABLE", secondaryStatus: "AD_STATUS_NOT_APPROVED", quality: 0.6 },
];

function dayFactor(date: string): number {
  // Weekly seasonality + slight upward trend over time.
  const d = new Date(date + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  const weekend = dow === 0 || dow === 6 ? 1.15 : 1;
  return weekend;
}

function buildDaily(ad: MockAdDef, date: string): DailyMetric {
  const r = rng(ad.id + date);
  const f = dayFactor(date) * ad.quality;

  // Disabled / rejected ads still have historical impressions but taper off.
  const delivering =
    ad.operationStatus === "ENABLE" &&
    !ad.secondaryStatus.includes("DISABLE") &&
    !ad.secondaryStatus.includes("NOT_APPROVED");

  const base = (delivering ? 1 : 0.25) * (3000 + r() * 9000) * f;
  const impressions = Math.round(base);

  const ctr = 0.008 + r() * 0.022; // 0.8%–3.0%
  const clicks = Math.round(impressions * ctr);

  const cpc = 0.25 + r() * 0.9;
  const spend = +(clicks * cpc).toFixed(2);

  const cvr = 0.02 + r() * 0.06; // 2%–8%
  const conversions = +(clicks * cvr).toFixed(0);

  const aov = 28 + r() * 45;
  const conversionValue = +(conversions * aov).toFixed(2);

  const videoViews = Math.round(impressions * (0.85 + r() * 0.12));
  const video2s = Math.round(videoViews * (0.45 + r() * 0.3));
  const video6s = Math.round(video2s * (0.4 + r() * 0.3));
  const videoP25 = Math.round(video2s * (0.6 + r() * 0.2));
  const videoP50 = Math.round(videoP25 * (0.6 + r() * 0.2));
  const videoP75 = Math.round(videoP50 * (0.6 + r() * 0.2));
  const videoP100 = Math.round(videoP75 * (0.5 + r() * 0.3));

  const likes = Math.round(impressions * (0.004 + r() * 0.012));
  const comments = Math.round(likes * (0.02 + r() * 0.06));
  const shares = Math.round(likes * (0.05 + r() * 0.1));
  const follows = Math.round(likes * (0.03 + r() * 0.05));
  const profileVisits = Math.round(likes * (0.1 + r() * 0.2));

  return {
    date,
    impressions,
    clicks,
    spend,
    conversions,
    conversionValue,
    videoViews,
    video2s,
    video6s,
    videoP25,
    videoP50,
    videoP75,
    videoP100,
    likes,
    comments,
    shares,
    follows,
    profileVisits,
  };
}

/** Full mock dataset for a date range, in the same shape the DB layer returns. */
export function getMockAds(range: DateRange): AdRecord[] {
  const days = listDays(range);
  return MOCK_ADS.map((ad, i) => {
    // Spread the sample ads evenly across Maanesten's markets.
    const market = MAANESTEN_MARKETS[i % MAANESTEN_MARKETS.length];
    return {
      id: ad.id,
      name: ad.name,
      advertiserId: market.id,
      advertiserName: market.name,
      campaignName: ad.campaignName,
      adGroupName: ad.adGroupName,
      operationStatus: ad.operationStatus,
      secondaryStatus: ad.secondaryStatus,
      thumbnailUrl: null,
      status: deriveStatus(ad.operationStatus, ad.secondaryStatus),
      daily: days.map((date) => buildDaily(ad, date)),
    };
  });
}
