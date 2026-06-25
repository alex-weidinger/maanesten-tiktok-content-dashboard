// Advertiser (ad account) helpers for Maanesten's multi-market setup.
import type { AdRecord } from "./types";

export interface Account {
  id: string;
  name: string;
}

/**
 * Known Maanesten ad accounts. Used to give env-configured advertiser IDs a
 * friendly market label, and to make the mock data realistic. TikTok-synced
 * data uses the real account name returned by the API and falls back to these.
 */
export const MAANESTEN_MARKETS: Account[] = [
  { id: "7158415190713745409", name: "Maanesten DK" },
  { id: "7379535813849612304", name: "Maanesten NO" },
  { id: "7462645389956087825", name: "Maanesten US" },
  { id: "7379535655174668289", name: "Maanesten EU" },
  { id: "7331278201265651714", name: "Maanesten DE" },
  { id: "7405170607735832593", name: "Maanesten SE" },
];

const NAME_BY_ID = new Map(MAANESTEN_MARKETS.map((m) => [m.id, m.name]));

/** Best-effort friendly label for an advertiser id. */
export function labelForAdvertiser(id: string, fallback?: string | null): string {
  return NAME_BY_ID.get(id) ?? fallback ?? id;
}

/** Unique accounts present in a set of ads, sorted by name. */
export function listAccounts(ads: AdRecord[]): Account[] {
  const map = new Map<string, string>();
  for (const ad of ads) {
    if (!ad.advertiserId) continue;
    if (!map.has(ad.advertiserId)) {
      map.set(ad.advertiserId, ad.advertiserName ?? labelForAdvertiser(ad.advertiserId));
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
