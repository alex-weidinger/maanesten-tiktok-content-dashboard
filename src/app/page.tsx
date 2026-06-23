import { Suspense } from "react";
import { format } from "date-fns";
import { getDashboardData } from "@/lib/data";
import { rangeFromParams, previousRange, formatRangeLabel } from "@/lib/dates";
import { aggregateAds, delta, HOOK_RATE_BASIS } from "@/lib/metrics";
import { buildTimeSeries, buildAdRows } from "@/lib/series";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
} from "@/lib/format";
import { PeriodSelector } from "@/components/PeriodSelector";
import { ShareButton } from "@/components/ShareButton";
import { KpiCard } from "@/components/KpiCard";
import { TrendChart } from "@/components/TrendChart";
import { EngagementChart } from "@/components/EngagementChart";
import { AdTable } from "@/components/AdTable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ preset?: string; start?: string; end?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const range = rangeFromParams(params);
  const prevRange = previousRange(range);

  const [current, previous] = await Promise.all([
    getDashboardData(range),
    getDashboardData(prevRange),
  ]);

  const totals = aggregateAds(current.ads);
  const prevTotals = aggregateAds(previous.ads);
  const series = buildTimeSeries(current.ads, range);
  const rows = buildAdRows(current.ads);

  const liveCount = current.ads.filter((a) => a.status === "live").length;

  const kpis = [
    { label: "Spend", value: formatCurrency(totals.spend), delta: delta(totals.spend, prevTotals.spend), invert: true },
    { label: "Revenue", value: formatCurrency(totals.conversionValue), delta: delta(totals.conversionValue, prevTotals.conversionValue) },
    { label: "ROAS", value: formatRoas(totals.roas), delta: delta(totals.roas, prevTotals.roas) },
    { label: "Conversions", value: formatNumber(totals.conversions), delta: delta(totals.conversions, prevTotals.conversions) },
    { label: "Conversion rate", value: formatPercent(totals.conversionRate), delta: delta(totals.conversionRate, prevTotals.conversionRate), hint: "Conversions / clicks" },
    { label: "CTR", value: formatPercent(totals.ctr), delta: delta(totals.ctr, prevTotals.ctr), hint: "Clicks / impressions" },
    { label: "Hook rate", value: formatPercent(totals.hookRate), delta: delta(totals.hookRate, prevTotals.hookRate), hint: `${HOOK_RATE_BASIS === "video6s" ? "6-second" : "2-second"} video views / impressions` },
    { label: "Engagement rate", value: formatPercent(totals.engagementRate), delta: delta(totals.engagementRate, prevTotals.engagementRate), hint: "(Likes + comments + shares) / impressions" },
  ];

  const engagement = [
    { name: "Likes", value: totals.likes },
    { name: "Comments", value: totals.comments },
    { name: "Shares", value: totals.shares },
    { name: "Follows", value: totals.follows },
    { name: "Profile visits", value: totals.profileVisits },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-7 rounded-lg bg-accent" aria-hidden />
            <h1 className="text-xl font-semibold tracking-tight">
              TikTok Ads — Content Dashboard
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatRangeLabel(range)} ·{" "}
            <span className="text-foreground font-medium">{current.ads.length}</span> ads ·{" "}
            <span className="text-positive font-medium">{liveCount} live</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton />
        </div>
      </header>

      {/* Period selector */}
      <div className="mt-5">
        <Suspense fallback={<div className="h-9" />}>
          <PeriodSelector range={range} />
        </Suspense>
      </div>

      {current.source === "mock" && (
        <div className="mt-4 rounded-lg border border-[#ffe0b3] bg-[#fff8ee] px-4 py-2.5 text-sm text-[#8a5a08]">
          Showing <strong>sample data</strong>. Add your TikTok API credentials and a
          database to display live ad performance — see the README.
        </div>
      )}

      {/* KPI grid */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </section>

      {/* Charts */}
      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart data={series} />
        </div>
        <div className="lg:col-span-1">
          <EngagementChart data={engagement} />
        </div>
      </section>

      {/* Ad table */}
      <section className="mt-5">
        <AdTable rows={rows} />
      </section>

      {/* Footer */}
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          Data source:{" "}
          <span className="font-medium text-foreground">
            {current.source === "db" ? "TikTok (synced)" : "Sample data"}
          </span>
          {current.sync.ranAt && (
            <> · Last updated {format(new Date(current.sync.ranAt), "MMM d, yyyy HH:mm")}</>
          )}
        </span>
        <span>Auto-refreshes daily</span>
      </footer>
    </div>
  );
}
