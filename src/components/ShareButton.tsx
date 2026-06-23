"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-muted transition-colors"
    >
      {copied ? (
        <>
          <Check className="size-4 text-positive" /> Copied
        </>
      ) : (
        <>
          <Link2 className="size-4" /> Share
        </>
      )}
    </button>
  );
}
