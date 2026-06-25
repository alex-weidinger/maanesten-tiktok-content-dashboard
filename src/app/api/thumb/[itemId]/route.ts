// Resolves a TikTok post's cover image (for Spark Ads) via the public oEmbed
// endpoint and redirects to it. Results are cached in-memory + via Cache-Control
// so we only hit oEmbed occasionally.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { url: string | null; ts: number }>();
const TTL = 6 * 60 * 60 * 1000; // 6h

// 9:16 neutral placeholder shown when no cover is available.
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320" viewBox="0 0 180 320"><rect width="180" height="320" fill="#eef0f4"/><path d="M74 150l40 24-40 24z" fill="#c2c7d0"/></svg>`;

function placeholder() {
  return new NextResponse(PLACEHOLDER, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function resolveCover(itemId: string): Promise<string | null> {
  const cached = cache.get(itemId);
  if (cached && Date.now() - cached.ts < TTL) return cached.url;

  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@_/video/${itemId}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { thumbnail_url?: string };
    const url = json.thumbnail_url ?? null;
    cache.set(itemId, { url, ts: Date.now() });
    return url;
  } catch {
    cache.set(itemId, { url: null, ts: Date.now() });
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  if (!/^\d+$/.test(itemId)) return placeholder();

  const cover = await resolveCover(itemId);
  if (!cover) return placeholder();

  return NextResponse.redirect(cover, {
    headers: { "Cache-Control": "public, max-age=21600" },
  });
}
