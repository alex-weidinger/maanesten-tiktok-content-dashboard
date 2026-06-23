// One-time TikTok OAuth helper — turns your developer app into an access token.
//
// Step 1: print the authorization link to open in your browser
//   npm run tiktok:auth-url -- https://YOUR-DASHBOARD-URL/
//
// Step 2: after approving, you land on YOUR-DASHBOARD-URL/?auth_code=XXXX —
//         copy that auth_code and exchange it for an access token:
//   npm run tiktok:token -- XXXX
//
// Reads TIKTOK_APP_ID and TIKTOK_APP_SECRET from the environment (.env).

const appId = process.env.TIKTOK_APP_ID;
const secret = process.env.TIKTOK_APP_SECRET;

function requireAppId() {
  if (!appId) {
    console.error("✗ TIKTOK_APP_ID is not set. Add it to your .env first.");
    process.exit(1);
  }
}

async function printAuthUrl() {
  requireAppId();
  const redirect = process.argv[3];
  if (!redirect) {
    console.error(
      "✗ Provide your redirect URL, e.g.\n    npm run tiktok:auth-url -- https://your-dashboard-url/",
    );
    process.exit(1);
  }
  const url =
    `https://business-api.tiktok.com/portal/auth` +
    `?app_id=${encodeURIComponent(appId!)}` +
    `&state=maanesten` +
    `&redirect_uri=${encodeURIComponent(redirect)}`;
  console.log("\nOpen this link in your browser, log in, and approve access:\n");
  console.log("  " + url + "\n");
  console.log(
    "After approving you'll be redirected to a URL containing `auth_code=...`.\n" +
      "Copy that code and run:  npm run tiktok:token -- <auth_code>\n",
  );
}

async function exchangeToken() {
  requireAppId();
  if (!secret) {
    console.error("✗ TIKTOK_APP_SECRET is not set. Add it to your .env first.");
    process.exit(1);
  }
  const authCode = process.argv[3];
  if (!authCode) {
    console.error("✗ Provide the auth_code:  npm run tiktok:token -- <auth_code>");
    process.exit(1);
  }

  const res = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, secret, auth_code: authCode }),
    },
  );
  const json = (await res.json()) as {
    code: number;
    message: string;
    data?: { access_token?: string; advertiser_ids?: string[]; scope?: string[] };
  };

  if (json.code !== 0 || !json.data?.access_token) {
    console.error(`✗ TikTok error ${json.code}: ${json.message}`);
    process.exit(1);
  }

  console.log("\n✓ Success! Add these to your environment variables:\n");
  console.log(`  TIKTOK_ACCESS_TOKEN=${json.data.access_token}`);
  const ids = json.data.advertiser_ids ?? [];
  if (ids.length === 1) {
    console.log(`  TIKTOK_ADVERTISER_ID=${ids[0]}`);
  } else if (ids.length > 1) {
    console.log(`  TIKTOK_ADVERTISER_ID=${ids[0]}   # pick the right one:`);
    ids.forEach((id) => console.log(`      • ${id}`));
  } else {
    console.log("  TIKTOK_ADVERTISER_ID=   # no advertiser IDs returned — check app permissions");
  }
  console.log("");
}

const mode = process.argv[2];
const run = mode === "url" ? printAuthUrl : mode === "token" ? exchangeToken : null;
if (!run) {
  console.error("Usage: tsx scripts/tiktok-auth.ts <url|token> ...");
  process.exit(1);
}
run().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});
