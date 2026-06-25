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

/** How many days back to refresh on each run (TikTok stats can be revised). */
const SYNC_WINDOW_DAYS = 35;

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
    | "adGroupName" | "operationStatus" | "secondaryStatus" | "thumbnailUrl" | "daily"> & {
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

    let rowCount = 0;
    for (const ad of ads) {
      await prisma.ad.upsert({
        where: { id: ad.id },
        create: {
          id: ad.id,
          name: ad.name,
          advertiserId: ad.advertiserId ?? null,
          advertiserName: ad.advertiserName ?? null,
          campaignId: ad.campaignId ?? null,
          campaignName: ad.campaignName ?? null,
          adGroupId: ad.adGroupId ?? null,
          adGroupName: ad.adGroupName ?? null,
          operationStatus: ad.operationStatus ?? null,
          secondaryStatus: ad.secondaryStatus ?? null,
          thumbnailUrl: ad.thumbnailUrl ?? null,
        },
        update: {
          name: ad.name,
          advertiserId: ad.advertiserId ?? null,
          advertiserName: ad.advertiserName ?? null,
          campaignId: ad.campaignId ?? null,
          campaignName: ad.campaignName ?? null,
          adGroupId: ad.adGroupId ?? null,
          adGroupName: ad.adGroupName ?? null,
          operationStatus: ad.operationStatus ?? null,
          secondaryStatus: ad.secondaryStatus ?? null,
          thumbnailUrl: ad.thumbnailUrl ?? null,
        },
      });

      for (const d of ad.daily) {
        await prisma.adDailyMetric.upsert({
          where: { adId_date: { adId: ad.id, date: new Date(d.date) } },
          create: { adId: ad.id, date: new Date(d.date), ...metricFields(d) },
          update: metricFields(d),
        });
        rowCount++;
      }
    }

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
