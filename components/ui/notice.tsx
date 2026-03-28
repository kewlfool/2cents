import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const noticeVariants = cva(
  "rounded-2xl border px-5 py-4 text-sm leading-6",
  {
    defaultVariants: {
      tone: "info",
    },
    variants: {
      tone: {
        error: "border-warning/30 bg-orange-50 text-warning",
        info: "border-line/70 bg-panel text-muted",
        success: "border-success/20 bg-emerald-50 text-success",
        warning: "border-warning/30 bg-orange-50 text-warning",
      },
    },
  },
);

type NoticeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof noticeVariants>;

export function Notice({
  className,
  tone,
  ...props
}: NoticeProps) {
  const isAssertive = tone === "error" || tone === "warning";

  return (
    <div
      aria-live={isAssertive ? "assertive" : "polite"}
      className={cn(noticeVariants({ className, tone }))}
      role={isAssertive ? "alert" : "status"}
      {...props}
    />
  );
}
