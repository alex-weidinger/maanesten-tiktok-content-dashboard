import { Suspense } from "react";
import { format } from "date-fns";
import { getDashboardData } from "@/lib/data";
import { rangeFromParams, formatRangeLabel } from "@/lib/dates";
import { buildTimeSeries, buildAdRows } from "@/lib/series";
import { listAccounts } from "@/lib/accounts";
import type { AdRecord } from "@/lib/types";
import { PeriodSelector } from "@/components/PeriodSelector";
import { MarketSelector } from "@/components/MarketSelector";
import { ShareButton } from "@/components/ShareButton";
import { TopCreatives } from "@/components/TopCreatives";
import { TrendChart } from "@/components/TrendChart";
import { AdTable } from "@/components/AdTable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  preset?: string;
  start?: string;
  end?: string;
  account?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const range = rangeFromParams(params);
  const selectedAccount = params.account ?? "all";

  const current = await getDashboardData(range);

  // Markets come from the full set so every option stays available when one is
  // selected; everything else is computed on the filtered set.
  const accounts = listAccounts(current.ads);
  const filterByAccount = (list: AdRecord[]) =>
    selectedAccount === "all"
      ? list
      : list.filter((a) => a.advertiserId === selectedAccount);

  const ads = filterByAccount(current.ads);
  const series = buildTimeSeries(ads, range);
  const rows = buildAdRows(ads);

  const liveCount = ads.filter((a) => a.status === "live").length;
  const selectedMarketName =
    selectedAccount === "all"
      ? "All markets"
      : accounts.find((a) => a.id === selectedAccount)?.name ?? "All markets";

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
            <span className="text-foreground font-medium">{selectedMarketName}</span> ·{" "}
            {formatRangeLabel(range)} ·{" "}
            <span className="text-foreground font-medium">{ads.length}</span> ads ·{" "}
            <span className="text-positive font-medium">{liveCount} live</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton />
        </div>
      </header>

      {/* Controls: period + market */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={<div className="h-9" />}>
          <PeriodSelector range={range} />
        </Suspense>
        <Suspense fallback={null}>
          <MarketSelector accounts={accounts} selected={selectedAccount} />
        </Suspense>
      </div>

      {current.source === "mock" && (
        <div className="mt-4 rounded-lg border border-[#ffe0b3] bg-[#fff8ee] px-4 py-2.5 text-sm text-[#8a5a08]">
          Showing <strong>sample data</strong>. Add your TikTok API credentials and a
          database to display live ad performance — see the README.
        </div>
      )}

      {/* Top creatives (primary view) */}
      <section className="mt-5">
        <TopCreatives rows={rows} />
      </section>

      {/* Per-creative table */}
      <section className="mt-5">
        <AdTable rows={rows} />
      </section>

      {/* Supporting trend context */}
      <section className="mt-5">
        <TrendChart data={series} />
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
