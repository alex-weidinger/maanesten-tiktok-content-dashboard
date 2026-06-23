# TikTok Ads — Content Performance Dashboard

A shareable, client-facing dashboard for **Maanesten's TikTok Ads**. It reports
content/creative performance, refreshes **automatically every day**, and is
deployed as a single public link you can hand to the client.

## What it shows

**Engagement metrics**
- **CTR** — clicks ÷ impressions
- **Hook rate** — 2-second (or 6-second) video views ÷ impressions
- **Engagement** — likes, comments, shares, follows, profile visits (+ engagement rate)

**Performance metrics**
- **Conversion rate** — conversions ÷ clicks
- **ROAS** — revenue ÷ spend
- Plus spend, revenue, conversions, CPA, CPM, CPC

**Per ad / content**
- A sortable, filterable table of every ad with a **Live / Paused / Disabled**
  status badge (driven by TikTok's `operation_status` + `secondary_status`).

**Time periods** — Last 7 / 14 / 30 days, Current month, Last month, plus a
**custom date range** picker. Every period shows the change vs. the previous
equivalent period.

---

## How it works

```
TikTok Marketing API ──(daily cron)──▶ /api/sync ──▶ Postgres ──▶ Dashboard (Next.js)
```

- **`src/lib/tiktok/client.ts`** pulls ad metadata + daily reporting metrics.
- **`/api/sync`** runs once a day (Vercel Cron), writing a rolling 35-day window
  into Postgres. It is protected by `CRON_SECRET`.
- The dashboard reads aggregated data for the selected period from Postgres.
- **No credentials yet?** The app ships with realistic **mock data** so the UI
  works out of the box. It automatically switches to live data once you add
  `TIKTOK_*` + `DATABASE_URL`.

---

## Run it locally

```bash
npm install
cp .env.example .env      # optional — runs on mock data if left blank
npm run dev               # http://localhost:3000
```

That's it for a UI preview. To wire up real data, follow the two setup sections
below.

---

## 1. TikTok Marketing API setup

You have a TikTok for Business account but no developer app yet. Here's the path:

1. **Create a developer app** — go to <https://business-api.tiktok.com/portal>,
   log in, and create a new app under **My Apps**. Note the **App ID** and
   **App Secret**.
2. **Add scopes** — request at least **Ads Management (read)** and
   **Reporting (read)** permissions.
3. **Authorize your ad account** — use TikTok's OAuth flow to authorize the app
   for the advertiser account that runs Maanesten's ads. This returns a
   long-lived **access token**.
   - TikTok docs: <https://business-api.tiktok.com/portal/docs?id=1738373141733378>
4. **Find your Advertiser ID** — in TikTok Ads Manager, or via the
   `/oauth2/advertiser/get/` endpoint after authorization.
5. Fill these into `.env` (and into Vercel later):
   ```
   TIKTOK_APP_ID=...
   TIKTOK_APP_SECRET=...
   TIKTOK_ACCESS_TOKEN=...
   TIKTOK_ADVERTISER_ID=...
   ```

> Until the app is approved, keep the values blank — the dashboard stays on mock
> data, so you can finish the design and share a preview with the client.

### Defining "hook rate"

TikTok exposes `video_watched_2s` and `video_watched_6s` (there's no native
3-second metric). Set the basis in `.env`:

```
HOOK_RATE_BASIS=video2s   # or video6s
```

---

## 2. Database setup (Postgres)

Any Postgres works. The easiest with Vercel is **Neon** or **Vercel Postgres**.

1. Create a Postgres database and copy its connection string.
2. Set it locally:
   ```
   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
   ```
3. Create the tables:
   ```bash
   npm run db:push
   ```
4. Pull data once (mock or live, depending on whether `TIKTOK_*` is set):
   ```bash
   npm run sync
   ```

Open <http://localhost:3000> — it now reads from the database.

---

## 3. Deploy to Vercel (with daily auto-update)

1. Push this repo to GitHub (see below), then **Import** it at
   <https://vercel.com/new>.
2. In **Project Settings → Environment Variables**, add:
   `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`, `TIKTOK_ACCESS_TOKEN`,
   `TIKTOK_ADVERTISER_ID`, `DATABASE_URL`, `CRON_SECRET`
   (generate the secret with `openssl rand -hex 32`).
3. Deploy. Vercel reads [`vercel.json`](./vercel.json) and registers the daily
   cron that calls `/api/sync` at **06:00 UTC**.
   - Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to the cron
     route, so only the scheduled job can trigger a refresh.
4. Share the resulting `*.vercel.app` URL (or a custom domain) with the client.

**Manual refresh anytime:** `https://your-app.vercel.app/api/sync?secret=YOUR_CRON_SECRET`

### Locking it down later (optional)

The link is currently public (anyone with the URL can view). To add a single
shared password, put the dashboard behind Vercel password protection, or add a
middleware check — ask and this can be wired up.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run db:push` | Create/update DB tables from the Prisma schema |
| `npm run sync` | Pull a 35-day window from TikTok (or mock) into the DB |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Project layout

```
src/
  app/
    page.tsx            Dashboard (server component)
    api/sync/route.ts   Daily cron endpoint
  components/           KPI cards, charts, sortable ad table, period picker
  lib/
    tiktok/client.ts    TikTok Marketing API client
    tiktok/mock.ts      Deterministic mock data
    metrics.ts          CTR / hook rate / ROAS / status definitions
    dates.ts            Period presets + custom range
    sync.ts             TikTok → Postgres upsert
    data.ts             Dashboard read layer (DB or mock)
prisma/schema.prisma    Ad + daily-metric tables
vercel.json             Daily cron schedule
```
