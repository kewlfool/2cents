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
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Planned savings</CardDescription>
            <CardTitle className="text-2xl">
              {formatMinorUnits(selectedSnapshot.plannedSavings, workspace.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Actual savings</CardDescription>
            <CardTitle className="text-2xl">
              {formatMinorUnits(selectedSnapshot.actualSavings, workspace.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Savings variance</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                selectedSnapshot.variance > 0
                  ? "text-success"
                  : selectedSnapshot.variance < 0
                    ? "text-warning"
                    : "text-ink",
              )}
            >
              {formatVariance(selectedSnapshot.variance, workspace.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Uncategorized</CardDescription>
            <CardTitle className="text-2xl">
              {reviewDetail.uncategorizedTransactions.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Category review</CardTitle>
            <CardDescription>
              Expand a category to inspect the exact transactions contributing to
              the month&apos;s actual total.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-line/80 overflow-hidden rounded-[24px] border">
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
          <Card>
            <CardHeader>
              <CardTitle>Top overspend areas</CardTitle>
              <CardDescription>
                Expense categories that finished above the planned monthly
                baseline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewDetail.overBudgetCategories.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                  No expense categories were over budget this month.
                </div>
              ) : (
                <>
                  <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
                    <p className="text-muted text-sm">Total overspend</p>
                    <p className="text-warning mt-2 text-2xl font-semibold tracking-tight">
                      {formatMinorUnits(totalOverBudgetAmount, workspace.currency)}
                    </p>
                  </div>
                  {reviewDetail.overBudgetCategories.map((row) => (
                    <div
                      className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4"
                      key={row.categoryId}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-ink font-semibold tracking-tight">
                            {row.categoryName}
                          </p>
                          <p className="text-muted mt-1 text-sm leading-6">
                            Planned {formatMinorUnits(row.plannedAmount, workspace.currency)} • Actual{" "}
                            {formatMinorUnits(row.actualAmount, workspace.currency)}
                          </p>
                        </div>
                        <Badge variant="warning">
                          {formatVariance(row.variance, workspace.currency)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top unusual merchants</CardTitle>
              <CardDescription>
                Current-month merchants that are new or materially above their
                recent average.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewDetail.unusualMerchants.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                  Not enough history to surface unusual merchant activity for
                  this month yet.
                </div>
              ) : (
                reviewDetail.unusualMerchants.map((merchant) => (
                  <div
                    className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4"
                    key={`${merchant.monthKey}-${merchant.merchantNormalized}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-ink font-semibold tracking-tight">
                          {merchant.merchantRawLabel}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-6">
                          {merchant.reason}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-6">
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
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uncategorized this month</CardTitle>
              <CardDescription>
                Transactions that still need an explicit category before the
                review is fully clean.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewDetail.uncategorizedTransactions.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                  No uncategorized transactions remain in this month.
                </div>
              ) : (
                reviewDetail.uncategorizedTransactions.map((transaction) => (
                  <div
                    className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4"
                    key={transaction.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-ink font-semibold tracking-tight">
                          {transaction.merchantRaw}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-6">
                          {transaction.date}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatMinorUnits(transaction.amount, workspace.currency)}
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
          <td className="bg-panel-strong/25 px-4 py-4" colSpan={5}>
            {transactions.length === 0 ? (
              <div className="text-muted rounded-[20px] bg-white/35 px-4 py-3 text-sm leading-6">
                No transactions landed in this category for the selected month.
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    className="border-line/70 bg-panel rounded-[20px] border px-4 py-3"
                    key={transaction.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-ink font-semibold tracking-tight">
                          {transaction.merchantRaw}
                        </p>
                        <p className="text-muted mt-1 text-sm leading-6">
                          {transaction.date}
                          {transaction.notes ? ` • ${transaction.notes}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatMinorUnits(transaction.amount, currency)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
