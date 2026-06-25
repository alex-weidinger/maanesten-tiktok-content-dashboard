// Daily sync: pull a rolling window of TikTok data into Postgres.
// Triggered by the Vercel Cron job (see /api/sync). Idempotent — re-running
// the same window simply upserts the same rows.
import { subDays } from "date-fns";
import { prisma } from "./db";
import { fetchTikTokAds, getTikTokConfig, type TikTokAd } from "./tiktok/client";
import { getMockAds } from "./tiktok/mock";
import { resolvePreset, type DateRange } from "./dates";
import type { AdRecord } from "./types";

export interface SyncResult {
  source: "tiktok" | "mock";
  adCount: number;
  rowCount: number;
}

/**
 * How many days back to refresh on each run. Needs to cover the longest preset
 * (30 days / a month) PLUS its previous-period comparison — hence ~70 days.
 * TikTok stats can also be revised for recent days, so re-pulling is intended.
 */
const SYNC_WINDOW_DAYS = 70;

function defaultWindow(): DateRange {
  const end = new Date();
  const start = subDays(end, SYNC_WINDOW_DAYS - 1);
  return { preset: "custom", start: iso(start), end: iso(end) };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function runSync(window?: DateRange): Promise<SyncResult> {
  const range = window ?? defaultWindow();
  const cfg = getTikTokConfig();

  let source: "tiktok" | "mock";
  let ads: Array<Pick<TikTokAd | AdRecord,
    | "id" | "name" | "advertiserId" | "advertiserName" | "campaignName"
    | "adGroupName" | "operationStatus" | "secondaryStatus" | "tiktokItemId"
    | "thumbnailUrl" | "daily"> & {
    campaignId?: string | null;
    adGroupId?: string | null;
  }>;

  try {
    if (cfg) {
      source = "tiktok";
      ads = await fetchTikTokAds(cfg, range.start, range.end);
    } else {
      source = "mock";
      ads = getMockAds(range);
    }

    // 1. Upsert ad metadata (status, names, market) with light concurrency.
    for (let i = 0; i < ads.length; i += 25) {
      await Promise.all(
        ads.slice(i, i + 25).map((ad) => {
          const fields = {
            name: ad.name,
            advertiserId: ad.advertiserId ?? null,
            advertiserName: ad.advertiserName ?? null,
            campaignId: ad.campaignId ?? null,
            campaignName: ad.campaignName ?? null,
            adGroupId: ad.adGroupId ?? null,
            adGroupName: ad.adGroupName ?? null,
            operationStatus: ad.operationStatus ?? null,
            secondaryStatus: ad.secondaryStatus ?? null,
            tiktokItemId: ad.tiktokItemId ?? null,
            thumbnailUrl: ad.thumbnailUrl ?? null,
          };
          return prisma.ad.upsert({
            where: { id: ad.id },
            create: { id: ad.id, ...fields },
            update: fields,
          });
        }),
      );
    }

    // 2. Bulk-replace this window's daily metrics (delete then createMany) —
    //    far faster than per-row upserts at thousands of ads.
    const adIds = ads.map((a) => a.id);
    const start = new Date(range.start);
    const end = new Date(range.end);
    for (let i = 0; i < adIds.length; i += 500) {
      await prisma.adDailyMetric.deleteMany({
        where: { adId: { in: adIds.slice(i, i + 500) }, date: { gte: start, lte: end } },
      });
    }

    const rows = ads.flatMap((ad) =>
      ad.daily.map((d) => ({ adId: ad.id, date: new Date(d.date), ...metricFields(d) })),
    );
    for (let i = 0; i < rows.length; i += 1000) {
      await prisma.adDailyMetric.createMany({ data: rows.slice(i, i + 1000) });
    }
    const rowCount = rows.length;

    await prisma.syncLog.create({
      data: { status: "ok", source, adCount: ads.length, rowCount },
    });

    return { source, adCount: ads.length, rowCount };
  } catch (err) {
    await prisma.syncLog.create({
      data: {
        status: "error",
        source: cfg ? "tiktok" : "mock",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

function metricFields(d: AdRecord["daily"][number]) {
  return {
    impressions: d.impressions,
    clicks: d.clicks,
    spend: d.spend,
    conversions: d.conversions,
    conversionValue: d.conversionValue,
    videoViews: d.videoViews,
    video2s: d.video2s,
    video6s: d.video6s,
    videoP25: d.videoP25,
    videoP50: d.videoP50,
    videoP75: d.videoP75,
    videoP100: d.videoP100,
    likes: d.likes,
    comments: d.comments,
    shares: d.shares,
    follows: d.follows,
    profileVisits: d.profileVisits,
  };
}

export { resolvePreset };
