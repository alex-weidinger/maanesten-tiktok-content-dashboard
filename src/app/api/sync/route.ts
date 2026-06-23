// Daily data refresh endpoint. Called by the Vercel Cron job (see vercel.json)
// and protected by CRON_SECRET so the public dashboard URL can't trigger syncs.
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends:  Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Allow manual trigger: /api/sync?secret=...
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasDatabase) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured; nothing to sync into." },
      { status: 400 },
    );
  }
  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
