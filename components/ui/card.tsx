import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-2xl border", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "border-line/70 bg-panel/96",
      elevated:
        "border-line/80 bg-panel shadow-[0_18px_45px_-34px_rgba(31,27,22,0.42)]",
      muted: "border-line/70 bg-panel-strong/18",
    },
  },
});

type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

export function Card({
  className,
  variant,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(cardVariants({ className, variant }))}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-ink text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-muted text-sm leading-5", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
