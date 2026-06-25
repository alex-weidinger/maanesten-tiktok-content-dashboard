// The dashboard's read layer. Returns ads + daily metrics for a date range,
// reading from Postgres when configured, otherwise deterministic mock data.
import "server-only";
import { format, parseISO } from "date-fns";
import { hasDatabase } from "./db";
import type { DateRange } from "./dates";
import { deriveStatus } from "./metrics";
import { getMockAds } from "./tiktok/mock";
import type { AdRecord, DailyMetric, SyncStatus } from "./types";

export interface DashboardData {
  ads: AdRecord[];
  source: "db" | "mock";
  sync: SyncStatus;
}

export async function getDashboardData(range: DateRange): Promise<DashboardData> {
  if (!hasDatabase) {
    return {
      ads: getMockAds(range),
      source: "mock",
      sync: { ranAt: null, status: null, source: "mock" },
    };
  }

  const { prisma } = await import("./db");
  const start = parseISO(range.start);
  const end = parseISO(range.end);

  const ads = await prisma.ad.findMany({
    include: {
      metrics: {
        where: { date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
      },
    },
  });

  const lastSync = await prisma.syncLog.findFirst({
    where: { status: "ok" },
    orderBy: { ranAt: "desc" },
  });

  const mapped: AdRecord[] = ads.map((ad) => ({
    id: ad.id,
    name: ad.name,
    advertiserId: ad.advertiserId,
    advertiserName: ad.advertiserName,
    campaignName: ad.campaignName,
    adGroupName: ad.adGroupName,
    operationStatus: ad.operationStatus,
    secondaryStatus: ad.secondaryStatus,
    tiktokItemId: ad.tiktokItemId,
    thumbnailUrl: ad.thumbnailUrl,
    status: deriveStatus(ad.operationStatus, ad.secondaryStatus),
    daily: ad.metrics.map(
      (m): DailyMetric => ({
        date: format(m.date, "yyyy-MM-dd"),
        impressions: m.impressions,
        clicks: m.clicks,
        spend: m.spend,
        conversions: m.conversions,
        conversionValue: m.conversionValue,
        videoViews: m.videoViews,
        video2s: m.video2s,
        video6s: m.video6s,
        videoP25: m.videoP25,
        videoP50: m.videoP50,
        videoP75: m.videoP75,
        videoP100: m.videoP100,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        follows: m.follows,
        profileVisits: m.profileVisits,
      }),
    ),
  }));

  // If the DB is configured but empty (no sync yet), fall back to mock so the
  // dashboard is never blank — clearly flagged via `source`.
  if (mapped.length === 0) {
    return {
      ads: getMockAds(range),
      source: "mock",
      sync: { ranAt: null, status: null, source: "mock" },
    };
  }

  return {
    ads: mapped,
    source: "db",
    sync: {
      ranAt: lastSync?.ranAt.toISOString() ?? null,
      status: lastSync?.status ?? null,
      source: lastSync?.source ?? null,
    },
  };
}
