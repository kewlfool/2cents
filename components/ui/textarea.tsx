import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-line bg-panel text-ink placeholder:text-muted/70 focus:border-accent focus:ring-accent/20 min-h-[var(--textarea-min-height)] w-full rounded-[var(--radius-panel)] border px-3 py-2.5 text-sm transition focus:ring-2 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
