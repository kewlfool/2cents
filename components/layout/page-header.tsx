import type { ReactNode } from "react";

type PageHeaderProps = {
  badge?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({
  badge,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <header className="border-line/80 bg-panel/90 rounded-[32px] border px-6 py-6 shadow-[0_24px_80px_-48px_rgba(31,27,22,0.52)] backdrop-blur sm:px-8 sm:py-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          {eyebrow ? (
            <p className="text-accent text-sm font-semibold tracking-[0.24em] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-ink text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="text-muted max-w-2xl text-sm leading-6 sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
    </header>
  );
}
