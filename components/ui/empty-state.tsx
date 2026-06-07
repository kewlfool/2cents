import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  body: ReactNode;
};

export function EmptyState({
  body,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-line/70 bg-panel-strong/25 text-muted rounded-[var(--radius-control)] border px-3.5 py-3 text-sm leading-5",
        className,
      )}
      {...props}
    >
      {body}
    </div>
  );
}
