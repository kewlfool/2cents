import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        className={cn(
          "border-line bg-panel text-ink placeholder:text-muted/70 focus:border-accent focus:ring-accent/15 min-h-10 w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:ring-2 focus:outline-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
