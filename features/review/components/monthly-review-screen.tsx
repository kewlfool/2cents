"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { List, ListRow } from "@/components/ui/list";
import { Select } from "@/components/ui/select";
import { useMonthlyReviewWorkspace } from "@/features/review/hooks/use-monthly-review-workspace";
import { buildMonthlyReviewDetail } from "@/features/review/lib/monthly-review";
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

function SummaryMetric(props: {
  label: string;
  tone?: "default" | "success" | "warning";
  value: string | number;
}) {
  return (
    <div className="border-line/70 bg-panel/96 space-y-1 rounded-xl border px-4 py-3">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <p
        className={cn(
          "text-xl font-semibold tracking-tight",
          props.tone === "success"
            ? "text-success"
            : props.tone === "warning"
              ? "text-warning"
              : "text-ink",
        )}
      >
        {props.value}
      </p>
    </div>
  );
}

export function MonthlyReviewScreen() {
  const bootstrap = useAppBootstrap();
  const workspace = useMonthlyReviewWorkspace();
  const [selectedMonthKey, setSelectedMonthKey] = useState("");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const resolvedMonthKey =
    (selectedMonthKey &&
      workspace?.snapshots.some(
        (snapshot) => snapshot.monthKey === selectedMonthKey,
      ) &&
      selectedMonthKey) ||
    workspace?.snapshots[0]?.monthKey ||
    "";

  const selectedSnapshot =
    workspace?.snapshots.find((snapshot) => snapshot.monthKey === resolvedMonthKey) ??
    workspace?.snapshots[0] ??
    null;
  const reviewDetail =
    selectedSnapshot && workspace
      ? buildMonthlyReviewDetail({
          snapshot: selectedSnapshot,
          transactions: workspace.transactions,
        })
      : null;
  const totalOverBudgetAmount = useMemo(
    () =>
      reviewDetail?.overBudgetCategories.reduce(
        (total, row) => total + row.variance,
        0,
      ) ?? 0,
    [reviewDetail],
  );

  function toggleCategory(categoryId: string) {
    setExpandedCategoryIds((currentIds) =>
      currentIds.includes(categoryId)
        ? currentIds.filter((id) => id !== categoryId)
        : [...currentIds, categoryId],
    );
  }

  if (bootstrap.status === "booting" || !workspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Monthly review loading</Badge>}
          description="Preparing monthly snapshots, transactions, and budget context from local storage."
          eyebrow="Monthly review"
          title="Monthly review"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            Loading the local monthly review workspace from IndexedDB.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedSnapshot || !reviewDetail) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Review live</Badge>}
          description="Monthly review compares planned and actual results once local snapshots are available."
          eyebrow="Monthly review"
          title="Monthly review"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            No monthly snapshots are available yet. Import statement activity or
            seed data first.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        badge={<Badge variant="accent">Phase 11 ready</Badge>}
        description="Review each month as a calm planned-versus-actual reconciliation: savings, category variance, overspend, unusual merchants, and the underlying transactions all stay visible."
        eyebrow="Monthly review"
        title="Monthly review"
      />

      <section className="grid gap-4 print:grid-cols-[1fr_auto] md:grid-cols-[1fr_auto]">
        <Card variant="muted">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <label
                className="text-ink block text-sm font-semibold"
                htmlFor="monthly-review-month"
              >
                Review month
              </label>
              <Select
                id="monthly-review-month"
                onChange={(event) => {
                  setExpandedCategoryIds([]);
                  setSelectedMonthKey(event.target.value);
                }}
                value={resolvedMonthKey}
              >
                {workspace.snapshots.map((snapshot) => (
                  <option key={snapshot.monthKey} value={snapshot.monthKey}>
                    {formatMonthKeyLabel(
                      snapshot.monthKey,
                      workspace.locale,
                      workspace.monthStartDay,
                    )}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <Badge variant="outline">
                {formatMonthKeyLabel(
                  selectedSnapshot.monthKey,
                  workspace.locale,
                  workspace.monthStartDay,
                )}
              </Badge>
              <Button onClick={() => window.print()} variant="secondary">
                Print review
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Planned savings"
          value={formatMinorUnits(selectedSnapshot.plannedSavings, workspace.currency)}
        />
        <SummaryMetric
          label="Actual savings"
          value={formatMinorUnits(selectedSnapshot.actualSavings, workspace.currency)}
        />
        <SummaryMetric
          label="Savings variance"
          tone={
            selectedSnapshot.variance > 0
              ? "success"
              : selectedSnapshot.variance < 0
                ? "warning"
                : "default"
          }
          value={formatVariance(selectedSnapshot.variance, workspace.currency)}
        />
        <SummaryMetric
          label="Uncategorized"
          value={reviewDetail.uncategorizedTransactions.length}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card variant="elevated">
          <CardHeader className="border-b border-line/60">
            <CardTitle>Category review</CardTitle>
            <CardDescription>
              Expand a category to inspect the exact transactions contributing to
              the month&apos;s actual total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="border-line/80 overflow-hidden rounded-xl border">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-panel-strong/55 text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Planned</th>
                      <th className="px-4 py-3 font-semibold">Actual</th>
                      <th className="px-4 py-3 font-semibold">Variance</th>
                      <th className="px-4 py-3 font-semibold print:hidden">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-line/70 bg-panel divide-y">
                    {reviewDetail.categoryRows.map((row) => {
                      const isExpanded = expandedCategoryIds.includes(row.categoryId);

                      return (
                        <FragmentRow
                          actualAmount={row.actualAmount}
                          categoryId={row.categoryId}
                          categoryKind={row.categoryKind}
                          categoryName={row.categoryName}
                          currency={workspace.currency}
                          isExpanded={isExpanded}
                          onToggle={toggleCategory}
                          plannedAmount={row.plannedAmount}
                          transactions={row.transactions}
                          variance={row.variance}
                          key={row.categoryId}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card variant="muted">
            <CardHeader>
              <CardTitle>Top overspend areas</CardTitle>
              <CardDescription>
                Expense categories that finished above the planned monthly
                baseline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewDetail.overBudgetCategories.length === 0 ? (
                <div className="border-line/70 bg-panel text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  No expense categories were over budget this month.
                </div>
              ) : (
                <>
                  <div className="border-line/70 bg-panel rounded-xl border px-4 py-4">
                    <p className="text-muted text-sm">Total overspend</p>
                    <p className="text-warning mt-2 text-2xl font-semibold tracking-tight">
                      {formatMinorUnits(totalOverBudgetAmount, workspace.currency)}
                    </p>
                  </div>
                  <List>
                    {reviewDetail.overBudgetCategories.map((row) => (
                      <ListRow className="gap-3" key={row.categoryId}>
                        <div className="min-w-0 flex-1">
                          <p className="text-ink font-semibold tracking-tight">
                            {row.categoryName}
                          </p>
                          <p className="text-muted mt-1 text-sm leading-5">
                            Planned {formatMinorUnits(row.plannedAmount, workspace.currency)} • Actual{" "}
                            {formatMinorUnits(row.actualAmount, workspace.currency)}
                          </p>
                        </div>
                        <Badge variant="warning">
                          {formatVariance(row.variance, workspace.currency)}
                        </Badge>
                      </ListRow>
                    ))}
                  </List>
                </>
              )}
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardHeader>
              <CardTitle>Top unusual merchants</CardTitle>
              <CardDescription>
                Current-month merchants that are new or materially above their
                recent average.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewDetail.unusualMerchants.length === 0 ? (
                <div className="border-line/70 bg-panel text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  Not enough history to surface unusual merchant activity for
                  this month yet.
                </div>
              ) : (
                <List>
                  {reviewDetail.unusualMerchants.map((merchant) => (
                    <ListRow
                      className="gap-3"
                      key={`${merchant.monthKey}-${merchant.merchantNormalized}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-ink font-semibold tracking-tight">
                          {merchant.merchantRawLabel}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-5">
                          {merchant.reason}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-5">
                          Current {formatMinorUnits(merchant.currentAmount, workspace.currency)}
                          {merchant.averagePriorAmount > 0
                            ? ` • Recent avg ${formatMinorUnits(merchant.averagePriorAmount, workspace.currency)}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          merchant.varianceAmount > 0 ? "warning" : "outline"
                        }
                      >
                        {formatVariance(merchant.varianceAmount, workspace.currency)}
                      </Badge>
                    </ListRow>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardHeader>
              <CardTitle>Uncategorized this month</CardTitle>
              <CardDescription>
                Transactions that still need an explicit category before the
                review is fully clean.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewDetail.uncategorizedTransactions.length === 0 ? (
                <div className="border-line/70 bg-panel text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  No uncategorized transactions remain in this month.
                </div>
              ) : (
                <List>
                  {reviewDetail.uncategorizedTransactions.map((transaction) => (
                    <ListRow className="gap-3" key={transaction.id}>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink font-semibold tracking-tight">
                          {transaction.merchantRaw}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-5">
                          {transaction.date}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatMinorUnits(transaction.amount, workspace.currency)}
                      </Badge>
                    </ListRow>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

type FragmentRowProps = {
  actualAmount: number;
  categoryId: string;
  categoryKind: "income" | "expense";
  categoryName: string;
  currency: string;
  isExpanded: boolean;
  onToggle: (categoryId: string) => void;
  plannedAmount: number;
  transactions: ReturnType<typeof buildMonthlyReviewDetail>["categoryRows"][number]["transactions"];
  variance: number;
};

function FragmentRow({
  actualAmount,
  categoryId,
  categoryKind,
  categoryName,
  currency,
  isExpanded,
  onToggle,
  plannedAmount,
  transactions,
  variance,
}: FragmentRowProps) {
  return (
    <>
      <tr>
        <td className="px-4 py-3 align-top">
          <div className="space-y-1">
            <p className="text-ink font-semibold">{categoryName}</p>
            <Badge variant={categoryKind === "income" ? "accent" : "outline"}>
              {categoryKind}
            </Badge>
          </div>
        </td>
        <td className="text-muted px-4 py-3 align-top">
          {formatMinorUnits(plannedAmount, currency)}
        </td>
        <td className="text-muted px-4 py-3 align-top">
          {formatMinorUnits(actualAmount, currency)}
        </td>
        <td
          className={cn(
            "px-4 py-3 align-top font-semibold",
            variance > 0
              ? categoryKind === "expense"
                ? "text-warning"
                : "text-success"
              : variance < 0
                ? categoryKind === "expense"
                  ? "text-success"
                  : "text-warning"
                : "text-ink",
          )}
        >
          {formatVariance(variance, currency)}
        </td>
        <td className="px-4 py-3 align-top print:hidden">
          <Button
            aria-expanded={isExpanded}
            onClick={() => onToggle(categoryId)}
            size="sm"
            variant="secondary"
          >
            {isExpanded
              ? `Hide transactions for ${categoryName}`
              : `Show transactions for ${categoryName}`}
          </Button>
        </td>
      </tr>
      {isExpanded ? (
        <tr className="print:table-row">
          <td className="bg-panel-strong/20 px-4 py-4" colSpan={5}>
            {transactions.length === 0 ? (
              <div className="text-muted rounded-xl bg-white/35 px-4 py-3 text-sm leading-6">
                No transactions landed in this category for the selected month.
              </div>
            ) : (
              <List className="rounded-xl">
                {transactions.map((transaction) => (
                  <ListRow className="gap-3" key={transaction.id}>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink font-semibold tracking-tight">
                        {transaction.merchantRaw}
                      </p>
                      <p className="text-muted mt-1 text-sm leading-5">
                        {transaction.date}
                        {transaction.notes ? ` • ${transaction.notes}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {formatMinorUnits(transaction.amount, currency)}
                    </Badge>
                  </ListRow>
                ))}
              </List>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
