"use client";

import Link from "next/link";

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
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { formatMonthKeyLabel } from "@/lib/date";
import { formatMinorUnits } from "@/lib/money";

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

function SummaryCard(props: {
  description: string;
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle
          className={
            props.tone === "positive"
              ? "text-success text-2xl"
              : props.tone === "negative"
                ? "text-warning text-2xl"
                : "text-2xl"
          }
        >
          {props.value}
        </CardTitle>
        <p className="text-muted text-sm leading-6">{props.description}</p>
      </CardHeader>
    </Card>
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

  return (
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">Phase 11 ready</Badge>}
        description="A calm local-first summary of the current budget month: planned versus actual savings, uncategorized work left to do, recent imports, and the quickest paths back into the ledger."
        eyebrow="Dashboard"
        title="2cents dashboard"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          description={`Actual savings for ${monthLabel}.`}
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
        <SummaryCard
          description={`Planned savings target for ${monthLabel}.`}
          label="Planned savings"
          value={
            activeSnapshot
              ? formatMinorUnits(activeSnapshot.plannedSavings, summary.currency)
              : "Not ready"
          }
        />
        <SummaryCard
          description="Positive means the month is ahead of the baseline savings target."
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
        <SummaryCard
          description="Visible work still waiting for a category in the current review month."
          label="Uncategorized"
          value={String(summary.uncategorizedCount)}
        />
      </section>

      {bootstrap.errorMessage ? (
        <div className="border-warning/30 text-warning rounded-[28px] border bg-orange-50 px-5 py-4 text-sm leading-6">
          {bootstrap.errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Current month status</CardTitle>
              <CardDescription>
                A single operating view of the active budget, current snapshot,
                and the volume of local data on this browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
                  <p className="text-muted text-sm">Budget baseline</p>
                  <p className="text-ink mt-2 text-lg font-semibold tracking-tight">
                    {summary.activeBudgetName ?? "No active baseline"}
                  </p>
                </div>
                <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
                  <p className="text-muted text-sm">Review period</p>
                  <p className="text-ink mt-2 text-lg font-semibold tracking-tight">
                    {monthLabel}
                  </p>
                </div>
                <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
                  <p className="text-muted text-sm">Transactions</p>
                  <p className="text-ink mt-2 text-lg font-semibold tracking-tight">
                    {summary.transactionCount}
                  </p>
                </div>
                <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
                  <p className="text-muted text-sm">Saved rules</p>
                  <p className="text-ink mt-2 text-lg font-semibold tracking-tight">
                    {summary.ruleCount}
                  </p>
                </div>
              </div>

              {activeSnapshot ? (
                <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
                  <p className="text-muted text-sm">Income vs expenses</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-muted text-xs uppercase tracking-[0.18em]">
                        Actual income
                      </p>
                      <p className="text-ink mt-1 font-semibold">
                        {formatMinorUnits(activeSnapshot.actualIncome, summary.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted text-xs uppercase tracking-[0.18em]">
                        Actual expenses
                      </p>
                      <p className="text-ink mt-1 font-semibold">
                        {formatMinorUnits(
                          activeSnapshot.actualExpenses,
                          summary.currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                  No monthly snapshot is available yet. Import activity or add
                  transactions to populate the dashboard.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                The fastest routes back into the day-to-day budgeting workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Link className={buttonVariants({ variant: "primary" })} href="/imports">
                Import statement
              </Link>
              <Link
                className={buttonVariants({ variant: "secondary" })}
                href="/transactions"
              >
                Review transactions
              </Link>
              <Link
                className={buttonVariants({ variant: "secondary" })}
                href="/monthly-review"
              >
                Open monthly review
              </Link>
              <Link
                className={buttonVariants({ variant: "secondary" })}
                href="/settings"
              >
                Open settings
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Top overspend areas</CardTitle>
              <CardDescription>
                Expense categories currently running above the baseline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.overBudgetCategories.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                  No expense categories are over budget for the current review
                  month.
                </div>
              ) : (
                summary.overBudgetCategories.map((category) => (
                  <div
                    className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4"
                    key={category.categoryId}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-ink font-semibold tracking-tight">
                          {category.categoryName}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-6">
                          Planned{" "}
                          {formatMinorUnits(category.plannedAmount, summary.currency)}{" "}
                          • Actual{" "}
                          {formatMinorUnits(category.actualAmount, summary.currency)}
                        </p>
                      </div>
                      <Badge variant="warning">
                        {formatVariance(category.variance, summary.currency)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent imports</CardTitle>
              <CardDescription>
                The most recent locally saved statement files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.recentImports.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                  No statement imports have been saved yet.
                </div>
              ) : (
                summary.recentImports.map((statementImport) => (
                  <div
                    className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4"
                    key={statementImport.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-ink font-semibold tracking-tight">
                          {statementImport.fileName}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-6">
                          {formatMonthKeyLabel(
                            statementImport.monthKey,
                            "en-US",
                            summary.monthStartDay,
                          )}{" "}
                          • {statementImport.importedRowCount} imported rows
                        </p>
                      </div>
                      <Badge variant={getImportBadgeVariant(statementImport.status)}>
                        {statementImport.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
