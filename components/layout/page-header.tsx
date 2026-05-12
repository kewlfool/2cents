import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const pageHeaderVariants = cva(
  "border-line/70 flex flex-col border-b sm:flex-row sm:justify-between",
  {
    defaultVariants: {
      density: "compact",
    },
    variants: {
      density: {
        compact:
          "gap-[var(--space-stack)] pb-[var(--space-card-compact)] sm:items-start",
        roomy: "gap-[var(--space-page)] pb-[var(--space-page)] sm:items-end",
      },
    },
  },
);

type PageHeaderProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof pageHeaderVariants> & {
  badge?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: string;
};

export function PageHeader({
  badge,
  className,
  density,
  description,
  eyebrow,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(pageHeaderVariants({ className, density }))}
      {...props}
    >
      <div className="min-w-0 max-w-3xl space-y-1.5">
        {eyebrow ? (
          <p className="text-accent text-[0.68rem] font-semibold tracking-[var(--tracking-kicker)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-ink text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted max-w-2xl text-sm leading-5">{description}</p>
          ) : null}
        </div>
      </div>
      {badge ? (
        <div className="shrink-0 self-start">{badge}</div>
      ) : null}
    </header>
  );
}
