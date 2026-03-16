import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-line bg-panel text-ink placeholder:text-muted/70 focus:border-accent focus:ring-accent/20 min-h-11 w-full rounded-2xl border px-3.5 py-2.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition focus:ring-2 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
