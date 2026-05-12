import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function List({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-line/70 overflow-hidden rounded-[var(--radius-panel)] border bg-panel/96",
        className,
      )}
      {...props}
    />
  );
}

export function ListRow({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-line/70 flex items-start gap-[var(--space-row)] border-b px-[var(--space-card-compact)] py-[calc(var(--space-row)+0.125rem)] last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}
