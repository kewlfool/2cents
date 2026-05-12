import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva("border", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "border-line/70 rounded-[var(--radius-panel)] bg-panel/96",
      elevated:
        "border-line/80 rounded-[var(--radius-panel)] bg-panel shadow-[var(--shadow-panel)]",
      muted: "border-line/70 rounded-[var(--radius-panel)] bg-panel-strong/18",
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

const cardHeaderVariants = cva("", {
  defaultVariants: {
    density: "default",
    divider: false,
  },
  variants: {
    density: {
      compact:
        "space-y-1 px-[var(--space-card)] py-[var(--space-card-compact)]",
      default: "space-y-1.5 p-[var(--space-card)]",
      roomy: "space-y-1.5 p-[var(--space-page)]",
    },
    divider: {
      true: "border-b border-line/60",
      false: "",
    },
  },
});

type CardHeaderProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardHeaderVariants>;

export function CardHeader({
  className,
  density,
  divider,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(cardHeaderVariants({ className, density, divider }))}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-ink text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-muted text-[0.8125rem] leading-5", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-[var(--space-card)] pb-[var(--space-card)]", className)}
      {...props}
    />
  );
}
