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
TikTok Marketing API ──(daily, Coolify Scheduled Task)──▶ sync ──▶ Postgres ──▶ Dashboard (Next.js)
```

- **`src/lib/tiktok/client.ts`** pulls ad metadata + daily reporting metrics.
- A **daily Coolify Scheduled Task** runs `npm run sync`, writing a rolling
  35-day window into Postgres. (You can also trigger it over HTTP at `/api/sync`,
  protected by `CRON_SECRET`.)
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

## 3. Deploy with Coolify (with daily auto-update)

The app is a standard Dockerfile, so Coolify can build and run it directly. The
Postgres database is a **separate Coolify resource** — there is no bundled
database and no docker-compose.

1. **Create the Postgres database** — in your Coolify project, add a new
   **PostgreSQL** resource. Copy its connection string (internal URL).
2. **Create the application** — add a new resource from your **Git repository**
   (`maanesten-tiktok-content-dashboard`). Coolify auto-detects the `Dockerfile`.
   Set the exposed port to **3000**.
3. **Add environment variables** on the application:
   `DATABASE_URL` (the Postgres URL from step 1), plus when ready:
   `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`, `TIKTOK_ACCESS_TOKEN`,
   `TIKTOK_ADVERTISER_ID`, and `CRON_SECRET` (`openssl rand -hex 32`).
4. **Deploy.** On boot the container creates the database tables automatically
   (`prisma db push`).
5. **Schedule the daily refresh** — add a **Scheduled Task** to the application:
   - Command: `npm run sync`
   - Frequency: `0 6 * * *` (every day at 06:00)
6. Share the app's public URL with the client.

**Manual refresh anytime:** run the Scheduled Task on demand, or call
`https://your-domain/api/sync?secret=YOUR_CRON_SECRET`.

---

## Local development with Docker

Everything runs in containers — no Node or Postgres installed on your machine,
no docker-compose.

```bash
# 1. A network so the app and database can talk
docker network create ttdash

# 2. A local Postgres
docker run -d --name ttdash-db --network ttdash \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tiktok \
  -p 5432:5432 postgres:16

# 3. Build and run the dashboard
docker build -t ttdash .
docker run --rm --network ttdash -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@ttdash-db:5432/tiktok" \
  ttdash
```

Open <http://localhost:3000>. To load sample data into the local database, run a
one-off sync:

```bash
docker run --rm --network ttdash \
  -e DATABASE_URL="postgresql://postgres:postgres@ttdash-db:5432/tiktok" \
  ttdash npm run sync
```

> Prefer no database while previewing the UI? Run the app container **without**
> `DATABASE_URL` and it serves sample data.

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
Dockerfile              Production image (Coolify + local)
docker-entrypoint.sh    Runs prisma db push, then starts the app
```
