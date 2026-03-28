"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  caption: string;
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
}) {
  return (
    <div className="border-line/70 bg-panel/96 space-y-1 rounded-xl border px-4 py-3">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <p
        className={cn(
          "text-xl font-semibold tracking-tight",
          props.tone === "positive"
            ? "text-success"
            : props.tone === "negative"
              ? "text-warning"
              : "text-ink",
        )}
      >
        {props.value}
      </p>
      <p className="text-muted text-sm leading-5">{props.caption}</p>
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
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Dashboard loading</Badge>}
          description="Preparing the local dashboard summary from IndexedDB."
          eyebrow="Dashboard"
          title="2cents dashboard"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            Loading the current month summary, recent imports, and local quick
            actions.
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
          body: "Transactions still need a category before the month closes cleanly.",
          title: "Finish categorizing imported activity",
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
      title: `${category.categoryName} is running over baseline`,
    })),
  ].filter((row): row is AttentionRow => row !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">Dashboard live</Badge>}
        description="A tighter local-first operating view of the active month: savings, outstanding review work, recent imports, and the fastest routes back into the ledger."
        eyebrow="Dashboard"
        title="2cents dashboard"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          caption={`Actual savings for ${monthLabel}.`}
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
          caption={`Planned savings target for ${monthLabel}.`}
          label="Planned savings"
          value={
            activeSnapshot
              ? formatMinorUnits(activeSnapshot.plannedSavings, summary.currency)
              : "Not ready"
          }
        />
        <SummaryMetric
          caption="Positive means the month is ahead of the savings target."
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
          caption="Transactions in the active month that still need review."
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

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
        <div className="grid gap-4">
          <Card variant="elevated">
            <CardHeader className="border-b border-line/60">
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>
                Start with anything uncategorized or running above the baseline.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {attentionRows.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/25 text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  The current month is in a calm state. Nothing is uncategorized
                  and no tracked expense categories are over baseline.
                </div>
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
                        {row.actionLabel}
                      </Link>
                    </ListRow>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Recent imports</CardTitle>
              <CardDescription>
                The most recent locally saved statement files.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {summary.recentImports.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/25 text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  No statement imports have been saved yet.
                </div>
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
                          • {statementImport.importedRowCount} imported rows
                        </p>
                      </div>
                    </ListRow>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Fastest routes back into the working screens.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 pt-4">
              <QuickActionLink href="/imports" label="Import statement" tone="primary" />
              <QuickActionLink href="/transactions" label="Review transactions" />
              <QuickActionLink href="/monthly-review" label="Open monthly review" />
              <QuickActionLink href="/settings" label="Open settings" />
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardHeader className="border-b border-line/60">
              <CardTitle>Workspace snapshot</CardTitle>
              <CardDescription>
                Current local baseline, review period, and stored volume.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <List>
                <ListRow className="items-center justify-between gap-4">
                  <div>
                    <p className="text-ink text-sm font-semibold">Budget baseline</p>
                    <p className="text-muted text-sm leading-5">
                      Active plan on this device
                    </p>
                  </div>
                  <p className="text-ink text-sm font-semibold">
                    {summary.activeBudgetName ?? "No active baseline"}
                  </p>
                </ListRow>
                <ListRow className="items-center justify-between gap-4">
                  <div>
                    <p className="text-ink text-sm font-semibold">Review period</p>
                    <p className="text-muted text-sm leading-5">
                      Current month label using your month-start preference
                    </p>
                  </div>
                  <p className="text-ink text-sm font-semibold">{monthLabel}</p>
                </ListRow>
                <ListRow className="items-center justify-between gap-4">
                  <div>
                    <p className="text-ink text-sm font-semibold">Transactions</p>
                    <p className="text-muted text-sm leading-5">
                      Saved locally in this browser
                    </p>
                  </div>
                  <p className="text-ink text-sm font-semibold">
                    {summary.transactionCount}
                  </p>
                </ListRow>
                <ListRow className="items-center justify-between gap-4">
                  <div>
                    <p className="text-ink text-sm font-semibold">Saved rules</p>
                    <p className="text-muted text-sm leading-5">
                      Merchant matching rules ready for reuse
                    </p>
                  </div>
                  <p className="text-ink text-sm font-semibold">{summary.ruleCount}</p>
                </ListRow>
                <ListRow className="items-center justify-between gap-4">
                  <div>
                    <p className="text-ink text-sm font-semibold">Categories</p>
                    <p className="text-muted text-sm leading-5">
                      Active baseline categories
                    </p>
                  </div>
                  <p className="text-ink text-sm font-semibold">
                    {summary.categoryCount}
                  </p>
                </ListRow>
                <ListRow className="items-center justify-between gap-4">
                  <div>
                    <p className="text-ink text-sm font-semibold">Saved imports</p>
                    <p className="text-muted text-sm leading-5">
                      Statement files tracked in import history
                    </p>
                  </div>
                  <p className="text-ink text-sm font-semibold">
                    {summary.importCount}
                  </p>
                </ListRow>
              </List>
            </CardContent>
          </Card>

          {activeSnapshot ? (
            <Card>
              <CardHeader className="border-b border-line/60">
                <CardTitle>Income and expenses</CardTitle>
                <CardDescription>
                  Actual movement for the active review month.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <List>
                  <ListRow className="items-center justify-between gap-4">
                    <div>
                      <p className="text-ink text-sm font-semibold">Actual income</p>
                      <p className="text-muted text-sm leading-5">
                        Imported and manual inflows in {monthLabel}
                      </p>
                    </div>
                    <p className="text-ink text-sm font-semibold">
                      {formatMinorUnits(activeSnapshot.actualIncome, summary.currency)}
                    </p>
                  </ListRow>
                  <ListRow className="items-center justify-between gap-4">
                    <div>
                      <p className="text-ink text-sm font-semibold">Actual expenses</p>
                      <p className="text-muted text-sm leading-5">
                        Imported and manual outflows in {monthLabel}
                      </p>
                    </div>
                    <p className="text-ink text-sm font-semibold">
                      {formatMinorUnits(
                        activeSnapshot.actualExpenses,
                        summary.currency,
                      )}
                    </p>
                  </ListRow>
                </List>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
