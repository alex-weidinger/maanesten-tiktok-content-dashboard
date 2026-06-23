// Manual data sync: `npm run sync`. Pulls the rolling window from TikTok
// (or mock data) into the database. Requires DATABASE_URL to be set.
import { runSync } from "../src/lib/sync";

runSync()
  .then((r) => {
    console.log(`✓ Synced ${r.adCount} ads / ${r.rowCount} rows from ${r.source}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("✗ Sync failed:", err);
    process.exit(1);
  });
