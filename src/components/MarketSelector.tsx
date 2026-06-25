"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";
import { ChevronDown, Globe } from "lucide-react";
import type { Account } from "@/lib/accounts";

export function MarketSelector({
  accounts,
  selected,
}: {
  accounts: Account[];
  selected: string; // advertiser id, or "all"
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("account");
    else next.set("account", value);
    startTransition(() => router.push(`/?${next.toString()}`));
  }

  if (accounts.length <= 1) return null;

  return (
    <div
      className={clsx(
        "relative inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5",
        isPending && "opacity-60",
      )}
    >
      <Globe className="size-4 text-muted" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent pr-5 text-sm font-medium outline-none cursor-pointer"
      >
        <option value="all">All markets</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-4 text-muted" />
    </div>
  );
}
