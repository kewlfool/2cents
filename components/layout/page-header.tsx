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
    <header className="border-line/70 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <h1 className="text-ink text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="text-muted max-w-2xl text-sm leading-6">{description}</p>
        </div>
      </div>
      {badge ? (
        <div className="shrink-0 self-start sm:self-auto">{badge}</div>
      ) : null}
    </header>
  );
}
