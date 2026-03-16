import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        accent: "border-accent/20 bg-accent-soft text-accent-strong",
        default: "border-line bg-panel-strong/60 text-muted",
        outline: "border-line/90 bg-transparent text-muted",
        warning: "border-warning/20 bg-orange-50 text-warning",
      },
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ className, variant }))} {...props} />
  );
}
