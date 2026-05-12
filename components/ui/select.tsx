import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "border-line bg-panel text-ink focus:border-accent focus:ring-accent/15 min-h-[var(--control-height)] w-full rounded-[var(--radius-control)] border px-3 py-2 text-sm transition focus:ring-2 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
