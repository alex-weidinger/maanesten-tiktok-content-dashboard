// TikTok Marketing API client. Pulls ad metadata (status) + daily reporting
// metrics across one or more advertiser (ad account) IDs.
// See https://business-api.tiktok.com/portal/docs
import { labelForAdvertiser } from "../accounts";
import type { DailyMetric } from "../types";

const BASE = "https://business-api.tiktok.com/open_api/v1.3";

export interface TikTokConfig {
  accessToken: string;
  advertiserIds: string[];
}

/** Reads access token + advertiser IDs from env. Returns null if not configured. */
export function getTikTokConfig(): TikTokConfig | null {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  // Comma-separated TIKTOK_ADVERTISER_IDS, or single TIKTOK_ADVERTISER_ID.
  const ids = (process.env.TIKTOK_ADVERTISER_IDS || process.env.TIKTOK_ADVERTISER_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!accessToken || ids.length === 0) return null;
  return { accessToken, advertiserIds: ids };
}

export interface TikTokAd {
  id: string;
  name: string;
  advertiserId: string | null;
  advertiserName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adGroupId: string | null;
  adGroupName: string | null;
  operationStatus: string | null;
  secondaryStatus: string | null;
  thumbnailUrl: string | null;
  daily: DailyMetric[];
}

interface TikTokResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function ttGet<T>(
  accessToken: string,
  path: string,
  params: Record<string, unknown>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  const res = await fetch(url.toString(), {
    headers: { "Access-Token": accessToken },
    cache: "no-store",
  });
  const json = (await res.json()) as TikTokResponse<T>;
  if (json.code !== 0) {
    throw new Error(`TikTok API error ${json.code}: ${json.message}`);
  }
  return json.data;
}

// ── Advertiser (account) names ───────────────────────────────────────────────
interface AdvertiserInfoData {
  list: Array<{ advertiser_id: string; name: string }>;
}

async function fetchAdvertiserNames(
  accessToken: string,
  advertiserIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const data = await ttGet<AdvertiserInfoData>(accessToken, "/advertiser/info/", {
      advertiser_ids: advertiserIds,
      fields: ["advertiser_id", "name"],
    });
    for (const a of data.list) names.set(a.advertiser_id, a.name);
  } catch {
    /* fall back to known labels below */
  }
  return names;
}

// ── Ad metadata (names + status) ─────────────────────────────────────────────
interface AdListData {
  list: Array<{
    ad_id: string;
    ad_name: string;
    campaign_id?: string;
    campaign_name?: string;
    adgroup_id?: string;
    adgroup_name?: string;
    operation_status?: string;
    secondary_status?: string;
  }>;
  page_info: { page: number; total_page: number };
}

async function fetchAdMeta(accessToken: string, advertiserId: string) {
  const meta = new Map<string, Omit<TikTokAd, "daily" | "advertiserName">>();
  let page = 1;
  let totalPage = 1;
  do {
    const data = await ttGet<AdListData>(accessToken, "/ad/get/", {
      advertiser_id: advertiserId,
      fields: [
        "ad_id",
        "ad_name",
        "campaign_id",
        "campaign_name",
        "adgroup_id",
        "adgroup_name",
        "operation_status",
        "secondary_status",
      ],
      page,
      page_size: 100,
    });
    for (const a of data.list) {
      meta.set(a.ad_id, {
        id: a.ad_id,
        name: a.ad_name,
        advertiserId,
        campaignId: a.campaign_id ?? null,
        campaignName: a.campaign_name ?? null,
        adGroupId: a.adgroup_id ?? null,
        adGroupName: a.adgroup_name ?? null,
        operationStatus: a.operation_status ?? null,
        secondaryStatus: a.secondary_status ?? null,
        thumbnailUrl: null,
      });
    }
    totalPage = data.page_info?.total_page ?? 1;
    page += 1;
  } while (page <= totalPage);
  return meta;
}

// ── Reporting (daily metrics per ad) ─────────────────────────────────────────
const REPORT_METRICS = [
  "spend",
  "impressions",
  "clicks",
  "conversion",
  "complete_payment_roas",
  "video_play_actions",
  "video_watched_2s",
  "video_watched_6s",
  "video_views_p25",
  "video_views_p50",
  "video_views_p75",
  "video_views_p100",
  "likes",
  "comments",
  "shares",
  "follows",
  "profile_visits",
];

interface ReportData {
  list: Array<{
    dimensions: { ad_id: string; stat_time_day: string };
    metrics: Record<string, string>;
  }>;
  page_info: { page: number; total_page: number };
}

const num = (v: string | undefined) => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

async function fetchReport(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, DailyMetric[]>> {
  const byAd = new Map<string, DailyMetric[]>();
  let page = 1;
  let totalPage = 1;
  do {
    const data = await ttGet<ReportData>(accessToken, "/report/integrated/get/", {
      advertiser_id: advertiserId,
      report_type: "BASIC",
      data_level: "AUCTION_AD",
      dimensions: ["ad_id", "stat_time_day"],
      metrics: REPORT_METRICS,
      start_date: startDate,
      end_date: endDate,
      page,
      page_size: 1000,
    });
    for (const row of data.list) {
      const adId = row.dimensions.ad_id;
      const date = row.dimensions.stat_time_day.slice(0, 10);
      const m = row.metrics;
      const spend = num(m.spend);
      const roas = num(m.complete_payment_roas);
      const point: DailyMetric = {
        date,
        impressions: num(m.impressions),
        clicks: num(m.clicks),
        spend,
        conversions: num(m.conversion),
        conversionValue: +(spend * roas).toFixed(2), // revenue = spend × ROAS
        videoViews: num(m.video_play_actions),
        video2s: num(m.video_watched_2s),
        video6s: num(m.video_watched_6s),
        videoP25: num(m.video_views_p25),
        videoP50: num(m.video_views_p50),
        videoP75: num(m.video_views_p75),
        videoP100: num(m.video_views_p100),
        likes: num(m.likes),
        comments: num(m.comments),
        shares: num(m.shares),
        follows: num(m.follows),
        profileVisits: num(m.profile_visits),
      };
      const arr = byAd.get(adId) ?? [];
      arr.push(point);
      byAd.set(adId, arr);
    }
    totalPage = data.page_info?.total_page ?? 1;
    page += 1;
  } while (page <= totalPage);
  return byAd;
}

/** Fetch ads + daily metrics for a single advertiser account. */
async function fetchAdsForAdvertiser(
  accessToken: string,
  advertiserId: string,
  advertiserName: string,
  startDate: string,
  endDate: string,
): Promise<TikTokAd[]> {
  const [meta, report] = await Promise.all([
    fetchAdMeta(accessToken, advertiserId),
    fetchReport(accessToken, advertiserId, startDate, endDate),
  ]);

  const ads: TikTokAd[] = [];
  for (const [adId, base] of meta) {
    ads.push({ ...base, advertiserName, daily: report.get(adId) ?? [] });
  }
  // Ads with report rows but no meta (rare).
  for (const [adId, daily] of report) {
    if (!meta.has(adId)) {
      ads.push({
        id: adId,
        name: adId,
        advertiserId,
        advertiserName,
        campaignId: null,
        campaignName: null,
        adGroupId: null,
        adGroupName: null,
        operationStatus: null,
        secondaryStatus: null,
        thumbnailUrl: null,
        daily,
      });
    }
  }
  return ads;
}

/** Fetch ads across every configured advertiser account for [startDate, endDate]. */
export async function fetchTikTokAds(
  cfg: TikTokConfig,
  startDate: string,
  endDate: string,
): Promise<TikTokAd[]> {
  const names = await fetchAdvertiserNames(cfg.accessToken, cfg.advertiserIds);

  const perAccount = await Promise.all(
    cfg.advertiserIds.map((advertiserId) =>
      fetchAdsForAdvertiser(
        cfg.accessToken,
        advertiserId,
        names.get(advertiserId) ?? labelForAdvertiser(advertiserId),
        startDate,
        endDate,
      ),
    ),
  );

  return perAccount.flat();
}
