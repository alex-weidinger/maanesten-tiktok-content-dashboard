import clsx from "clsx";
import type { AdStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/metrics";

const STYLES: Record<AdStatus, string> = {
  live: "bg-[#e7f7ee] text-[#0f7a44] ring-[#bde8cf]",
  paused: "bg-[#fff4e5] text-[#b3640a] ring-[#ffe0b3]",
  disabled: "bg-[#f3f4f6] text-[#6b7280] ring-[#e0e2e7]",
};

const DOT: Record<AdStatus, string> = {
  live: "bg-[#16a34a]",
  paused: "bg-[#f59e0b]",
  disabled: "bg-[#9ca3af]",
};

export function StatusBadge({ status }: { status: AdStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
      )}
    >
      <span
        className={clsx(
          "size-1.5 rounded-full",
          DOT[status],
          status === "live" && "animate-pulse",
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
