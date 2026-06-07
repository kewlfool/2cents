"use client";

import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { formatMonthKeyLabel } from "@/lib/date";
import { formatMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";

function formatVariance(value: number, currency: string) {
  const absoluteValue = formatMinorUnits(Math.abs(value), currency);

  if (value === 0) {
    return absoluteValue;
  }

  return `${value > 0 ? "+" : "-"}${absoluteValue}`;
}

function getImportBadgeVariant(status: string) {
  switch (status) {
    case "committed":
      return "accent" as const;
    case "rolled_back":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

function SummaryMetric(props: {
  detail: string;
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
}) {
  return (
    <div className="border-line/70 bg-panel/96 rounded-[var(--radius-panel)] border px-3 py-2.5">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p
          className={cn(
            "text-lg font-semibold tracking-tight",
            props.tone === "positive"
              ? "text-success"
              : props.tone === "negative"
                ? "text-warning"
                : "text-ink",
          )}
        >
          {props.value}
        </p>
        <p className="text-muted text-right text-[0.75rem] leading-4">
          {props.detail}
        </p>
      </div>
    </div>
  );
}

function QuickActionLink(props: {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
}) {
  return (
    <Link
      className={buttonVariants({
        size: "sm",
        variant: props.tone === "primary" ? "primary" : "secondary",
      })}
      href={props.href}
    >
      {props.label}
    </Link>
  );
}

type AttentionRow = {
  actionHref: string;
  actionLabel: string;
  badge: ReactElement;
  body: string;
  title: string;
};

function DashboardSection(props: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="border-line/70 bg-panel/96 rounded-[var(--radius-panel)] border">
      <div className="border-line/60 flex items-start justify-between gap-3 border-b px-[var(--space-card)] py-[var(--space-card-compact)]">
        <div className="min-w-0">
          <h2 className="text-ink text-sm font-semibold tracking-tight">
            {props.title}
          </h2>
          {props.description ? (
            <p className="text-muted mt-1 text-[0.8125rem] leading-5">
              {props.description}
            </p>
          ) : null}
        </div>
        {props.actions ? <div className="shrink-0">{props.actions}</div> : null}
      </div>
      <div className="p-[var(--space-card)]">{props.children}</div>
    </section>
  );
}

function MetaRow(props: {
  label: string;
  secondary?: string;
  value: ReactNode;
}) {
  return (
    <ListRow className="items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold tracking-tight">{props.label}</p>
        {props.secondary ? (
          <p className="text-muted text-[0.8125rem] leading-5">{props.secondary}</p>
        ) : null}
      </div>
      <div className="text-ink shrink-0 text-sm font-semibold">{props.value}</div>
    </ListRow>
  );
}

export function DashboardPreview() {
  const bootstrap = useAppBootstrap();
  const summary = useDashboardSummary();
  const activeSnapshot = summary?.currentSnapshot ?? summary?.latestSnapshot ?? null;
  const monthLabel =
    activeSnapshot && summary
      ? formatMonthKeyLabel(
          activeSnapshot.monthKey,
          "en-US",
          summary.monthStartDay,
        )
      : "No snapshot yet";

  if (bootstrap.status === "booting" || !summary) {
    return (
      <div className="space-y-5">
        <PageHeader
          badge={<Badge variant="accent">Dashboard loading</Badge>}
          description="Preparing the workspace summary."
          eyebrow="Dashboard"
          title="2cents dashboard"
        />
        <Card>
          <CardContent className="text-muted p-5 text-sm leading-5">
            Loading the current month summary, imports, and review queue.
          </CardContent>
        </Card>
      </div>
    );
  }

  const attentionRows = [
    summary.uncategorizedCount > 0
      ? {
          actionHref: "/transactions",
          actionLabel: "Review transactions",
          badge: (
            <Badge variant="warning">
              {summary.uncategorizedCount} uncategorized
            </Badge>
          ),
          body: "Transactions still need categories.",
          title: "Finish categorizing activity",
        }
      : null,
    ...summary.overBudgetCategories.map((category) => ({
      actionHref: "/monthly-review",
      actionLabel: "Open monthly review",
      badge: (
        <Badge variant="warning">
          {formatVariance(category.variance, summary.currency)}
        </Badge>
      ),
      body: `Planned ${formatMinorUnits(
        category.plannedAmount,
        summary.currency,
      )} • Actual ${formatMinorUnits(category.actualAmount, summary.currency)}`,
      title: `${category.categoryName} over baseline`,
    })),
  ].filter((row): row is AttentionRow => row !== null);

  return (
    <div className="space-y-5">
      <PageHeader
        badge={<Badge variant="accent">Dashboard live</Badge>}
        description="Current month status and review queue."
        eyebrow="Dashboard"
        title="2cents dashboard"
      />

      <section className="border-line/70 bg-panel/96 rounded-[var(--radius-panel)] border px-[var(--space-card)] py-[var(--space-card-compact)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Badge variant="outline">{monthLabel}</Badge>
            <span className="text-muted text-sm">
              Baseline:{" "}
              <span className="text-ink font-semibold">
                {summary.activeBudgetName ?? "No active baseline"}
              </span>
            </span>
            <span className="text-muted text-sm">
              {summary.transactionCount} txns
            </span>
            <span className="text-muted text-sm">{summary.importCount} imports</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <QuickActionLink href="/imports" label="Import" tone="primary" />
            <QuickActionLink href="/transactions" label="Transactions" />
            <QuickActionLink href="/monthly-review" label="Review" />
            <QuickActionLink href="/settings" label="Settings" />
          </div>
        </div>
      </section>

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          detail={monthLabel}
          label="Actual savings"
          tone={
            (activeSnapshot?.actualSavings ?? 0) >= 0 ? "positive" : "negative"
          }
          value={
            activeSnapshot
              ? formatMinorUnits(activeSnapshot.actualSavings, summary.currency)
              : "Not ready"
          }
        />
        <SummaryMetric
          detail="Target"
          label="Planned savings"
          value={
            activeSnapshot
              ? formatMinorUnits(activeSnapshot.plannedSavings, summary.currency)
              : "Not ready"
          }
        />
        <SummaryMetric
          detail="Vs target"
          label="Savings variance"
          tone={
            (activeSnapshot?.variance ?? 0) > 0
              ? "positive"
              : (activeSnapshot?.variance ?? 0) < 0
                ? "negative"
                : "default"
          }
          value={
            activeSnapshot
              ? formatVariance(activeSnapshot.variance, summary.currency)
              : "Not ready"
          }
        />
        <SummaryMetric
          detail="Need category"
          label="Uncategorized"
          tone={summary.uncategorizedCount > 0 ? "negative" : "default"}
          value={String(summary.uncategorizedCount)}
        />
      </section>

      {bootstrap.errorMessage ? (
        <Notice tone="warning">
          {bootstrap.errorMessage}
        </Notice>
      ) : null}

      <section className="grid gap-3.5 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="grid gap-4">
          <DashboardSection
          actions={
            attentionRows.length > 0 ? (
              <Badge variant="warning">{attentionRows.length} open</Badge>
            ) : (
              <Badge variant="accent">Clear</Badge>
            )
          }
          title="Attention queue"
        >
            <div className="space-y-3">
              {attentionRows.length === 0 ? (
                <EmptyState body="Nothing needs review right now." />
              ) : (
                <List>
                  {attentionRows.map((row) => (
                    <ListRow className="items-center gap-3" key={row.title}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-ink text-sm font-semibold tracking-tight">
                            {row.title}
                          </p>
                          {row.badge}
                        </div>
                        <p className="text-muted text-sm leading-5">{row.body}</p>
                      </div>
                      <Link
                        className={buttonVariants({ size: "sm", variant: "secondary" })}
                        href={row.actionHref}
                      >
                        Open
                      </Link>
                    </ListRow>
                  ))}
                </List>
              )}
            </div>
          </DashboardSection>

          <DashboardSection
          actions={
              <Link
                className={buttonVariants({ size: "sm", variant: "secondary" })}
                href="/imports"
              >
                Imports
              </Link>
            }
            title="Recent imports"
          >
              {summary.recentImports.length === 0 ? (
                <EmptyState body="No saved imports yet." />
              ) : (
                <List>
                  {summary.recentImports.map((statementImport) => (
                    <ListRow className="items-center gap-3" key={statementImport.id}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-ink truncate text-sm font-semibold tracking-tight">
                            {statementImport.fileName}
                          </p>
                          <Badge
                            variant={getImportBadgeVariant(statementImport.status)}
                          >
                            {statementImport.status}
                          </Badge>
                        </div>
                        <p className="text-muted text-sm leading-5">
                          {formatMonthKeyLabel(
                            statementImport.monthKey,
                            "en-US",
                            summary.monthStartDay,
                          )}{" "}
                          • {statementImport.importedRowCount} rows
                        </p>
                      </div>
                      <Link
                        className={buttonVariants({ size: "sm", variant: "secondary" })}
                        href="/imports"
                      >
                        View
                      </Link>
                    </ListRow>
                  ))}
                </List>
              )}
          </DashboardSection>
        </div>

        <div className="grid gap-4">
          <DashboardSection title="Workspace snapshot">
              <List>
                <MetaRow
                  label="Budget baseline"
                  secondary="Active"
                  value={summary.activeBudgetName ?? "None"}
                />
                <MetaRow
                  label="Review period"
                  secondary="Current"
                  value={monthLabel}
                />
                <MetaRow
                  label="Transactions"
                  secondary="Local"
                  value={summary.transactionCount}
                />
                <MetaRow
                  label="Saved rules"
                  secondary="Ready"
                  value={summary.ruleCount}
                />
                <MetaRow
                  label="Categories"
                  secondary="Active"
                  value={summary.categoryCount}
                />
                <MetaRow
                  label="Saved imports"
                  secondary="History"
                  value={summary.importCount}
                />
              </List>
          </DashboardSection>

          {activeSnapshot ? (
            <DashboardSection title="Income and expenses">
                <List>
                  <MetaRow
                    label="Actual income"
                    secondary={monthLabel}
                    value={formatMinorUnits(
                      activeSnapshot.actualIncome,
                      summary.currency,
                    )}
                  />
                  <MetaRow
                    label="Actual expenses"
                    secondary={monthLabel}
                    value={formatMinorUnits(
                      activeSnapshot.actualExpenses,
                      summary.currency,
                    )}
                  />
                </List>
            </DashboardSection>
          ) : null}
        </div>
      </section>
    </div>
  );
}
