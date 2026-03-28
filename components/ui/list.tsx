import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function List({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-line/70 overflow-hidden rounded-2xl border bg-panel/96",
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
        "border-line/70 flex items-start gap-4 border-b px-4 py-3 last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}
