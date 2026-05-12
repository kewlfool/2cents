"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  detail?: string;
  label: string;
  tone?: "default" | "success" | "warning";
  value: string | number;
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
            props.tone === "success"
              ? "text-success"
              : props.tone === "warning"
                ? "text-warning"
                : "text-ink",
          )}
        >
          {props.value}
        </p>
        {props.detail ? (
          <p className="text-muted text-right text-[0.75rem] leading-4">
            {props.detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewSection(props: {
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

function SideRailValue(props: {
  accent?: "default" | "warning";
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line/70 bg-panel rounded-[var(--radius-control)] border px-3.5 py-3">
      <p className="text-muted text-[0.75rem] font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p
          className={cn(
            "text-lg font-semibold tracking-tight",
            props.accent === "warning" ? "text-warning" : "text-ink",
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

function TransactionMiniRow(props: {
  amount: string;
  primary: string;
  secondary: string;
}) {
  return (
    <ListRow className="gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-ink text-sm font-semibold tracking-tight">
          {props.primary}
        </p>
        <p className="text-muted text-[0.8125rem] leading-5">{props.secondary}</p>
      </div>
      <Badge variant="outline">{props.amount}</Badge>
    </ListRow>
  );
}

function CategoryRailRow(props: {
  amount: string;
  primary: string;
  secondary: string;
}) {
  return (
    <ListRow className="gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-ink text-sm font-semibold tracking-tight">
          {props.primary}
        </p>
        <p className="text-muted text-[0.8125rem] leading-5">{props.secondary}</p>
      </div>
      <Badge variant="warning">{props.amount}</Badge>
    </ListRow>
  );
}

function ExpandButton(props: {
  categoryName: string;
  isExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-expanded={props.isExpanded}
      onClick={props.onClick}
      size="sm"
      variant="secondary"
    >
      {props.isExpanded ? "Hide" : "Show"}
      <span className="sr-only"> transactions for {props.categoryName}</span>
    </Button>
  );
}

function CompactLoadingCard(props: { body: string }) {
  return (
    <Card>
      <CardContent className="text-muted p-5 text-sm leading-5">
        {props.body}
      </CardContent>
    </Card>
  );
}

function EmptyReviewState(props: { body: string }) {
  return (
    <div className="border-line/70 bg-panel text-muted rounded-[var(--radius-control)] border px-3.5 py-3 text-sm leading-5">
      {props.body}
    </div>
  );
}

function MonthlySnapshotToolbar(props: {
  monthLabel: string;
  monthOptions: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  transactionCount: number;
  value: string;
}) {
  return (
    <section className="border-line/70 bg-canvas/95 sticky top-0 z-10 rounded-[var(--radius-panel)] border backdrop-blur">
      <div className="flex flex-col gap-3 px-[var(--space-card)] py-[var(--space-card-compact)] lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(12rem,16rem)_auto_auto] sm:items-end">
          <div className="space-y-1.5">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="monthly-review-month"
            >
              Review month
            </label>
            <Select
              id="monthly-review-month"
              onChange={(event) => props.onChange(event.target.value)}
              value={props.value}
            >
              {props.monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex min-h-[var(--control-height)] items-center">
            <Badge variant="outline">{props.monthLabel}</Badge>
          </div>

          <div className="flex min-h-[var(--control-height)] items-center">
            <span className="text-muted text-sm">
              {props.transactionCount} reviewed transactions
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button onClick={() => window.print()} variant="secondary">
            Print review
          </Button>
        </div>
      </div>
    </section>
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
      <div className="space-y-5">
        <PageHeader
          badge={<Badge variant="accent">Monthly review loading</Badge>}
          description="Preparing monthly review data."
          eyebrow="Monthly review"
          title="Monthly review"
        />
        <CompactLoadingCard body="Loading the monthly review workspace." />
      </div>
    );
  }

  if (!selectedSnapshot || !reviewDetail) {
    return (
      <div className="space-y-5">
        <PageHeader
          badge={<Badge variant="accent">Review live</Badge>}
          description="Planned vs actual by month."
          eyebrow="Monthly review"
          title="Monthly review"
        />
        <CompactLoadingCard body="No monthly snapshots are available yet. Import statement activity or seed data first." />
      </div>
    );
  }

  const monthLabel = formatMonthKeyLabel(
    selectedSnapshot.monthKey,
    workspace.locale,
    workspace.monthStartDay,
  );
  const monthOptions = workspace.snapshots.map((snapshot) => ({
    label: formatMonthKeyLabel(
      snapshot.monthKey,
      workspace.locale,
      workspace.monthStartDay,
    ),
    value: snapshot.monthKey,
  }));

  return (
    <div className="space-y-5 print:space-y-4">
      <PageHeader
        badge={<Badge variant="accent">Review live</Badge>}
        description="Category variance, overspend, and uncategorized activity."
        eyebrow="Monthly review"
        title="Monthly review"
      />

      <MonthlySnapshotToolbar
        monthLabel={monthLabel}
        monthOptions={monthOptions}
        onChange={(value) => {
          setExpandedCategoryIds([]);
          setSelectedMonthKey(value);
        }}
        transactionCount={reviewDetail.selectedMonthTransactions.length}
        value={resolvedMonthKey}
      />

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          detail="Target"
          label="Planned savings"
          value={formatMinorUnits(selectedSnapshot.plannedSavings, workspace.currency)}
        />
        <SummaryMetric
          detail={monthLabel}
          label="Actual savings"
          value={formatMinorUnits(selectedSnapshot.actualSavings, workspace.currency)}
        />
        <SummaryMetric
          detail="Vs target"
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
          detail="Need category"
          label="Uncategorized"
          value={reviewDetail.uncategorizedTransactions.length}
        />
      </section>

      <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.95fr)]">
        <ReviewSection
          actions={
            <Badge variant="outline">{reviewDetail.categoryRows.length} categories</Badge>
          }
          title="Category review"
        >
          <div className="border-line/80 overflow-hidden rounded-[var(--radius-panel)] border">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-panel-strong/55 text-muted">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Category</th>
                    <th className="px-3.5 py-2.5 font-semibold">Planned</th>
                    <th className="px-3.5 py-2.5 font-semibold">Actual</th>
                    <th className="px-3.5 py-2.5 font-semibold">Var</th>
                    <th className="px-3.5 py-2.5 font-semibold print:hidden">
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
                        key={row.categoryId}
                        onToggle={toggleCategory}
                        plannedAmount={row.plannedAmount}
                        transactions={row.transactions}
                        variance={row.variance}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ReviewSection>

        <div className="grid gap-3.5 xl:sticky xl:top-[4.5rem] xl:self-start">
          <ReviewSection title="Top overspend areas">
            <div className="space-y-3">
              {reviewDetail.overBudgetCategories.length === 0 ? (
                <EmptyReviewState body="No expense categories were over budget this month." />
              ) : (
                <>
                  <SideRailValue
                    accent="warning"
                    detail="Across flagged categories"
                    label="Total overspend"
                    value={formatMinorUnits(totalOverBudgetAmount, workspace.currency)}
                  />
                  <List>
                    {reviewDetail.overBudgetCategories.map((row) => (
                      <CategoryRailRow
                        amount={formatVariance(row.variance, workspace.currency)}
                        key={row.categoryId}
                        primary={row.categoryName}
                        secondary={`Planned ${formatMinorUnits(row.plannedAmount, workspace.currency)} • Actual ${formatMinorUnits(row.actualAmount, workspace.currency)}`}
                      />
                    ))}
                  </List>
                </>
              )}
            </div>
          </ReviewSection>

          <ReviewSection title="Top unusual merchants">
            <div className="space-y-3">
              {reviewDetail.unusualMerchants.length === 0 ? (
                <EmptyReviewState body="Not enough history to surface unusual merchant activity yet." />
              ) : (
                <List>
                  {reviewDetail.unusualMerchants.map((merchant) => (
                    <TransactionMiniRow
                      amount={formatVariance(merchant.varianceAmount, workspace.currency)}
                      key={`${merchant.monthKey}-${merchant.merchantNormalized}`}
                      primary={merchant.merchantRawLabel}
                      secondary={`${merchant.reason} • Current ${formatMinorUnits(merchant.currentAmount, workspace.currency)}${merchant.averagePriorAmount > 0 ? ` • Recent avg ${formatMinorUnits(merchant.averagePriorAmount, workspace.currency)}` : ""}`}
                    />
                  ))}
                </List>
              )}
            </div>
          </ReviewSection>

          <ReviewSection title="Uncategorized this month">
            <div className="space-y-3">
              {reviewDetail.uncategorizedTransactions.length === 0 ? (
                <EmptyReviewState body="No uncategorized transactions remain in this month." />
              ) : (
                <List>
                  {reviewDetail.uncategorizedTransactions.map((transaction) => (
                    <TransactionMiniRow
                      amount={formatMinorUnits(transaction.amount, workspace.currency)}
                      key={transaction.id}
                      primary={transaction.merchantRaw}
                      secondary={transaction.date}
                    />
                  ))}
                </List>
              )}
            </div>
          </ReviewSection>
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
  transactions: ReturnType<
    typeof buildMonthlyReviewDetail
  >["categoryRows"][number]["transactions"];
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
        <td className="px-3.5 py-3 align-top">
          <div className="space-y-1">
            <p className="text-ink text-sm font-semibold tracking-tight">
              {categoryName}
            </p>
            <Badge variant={categoryKind === "income" ? "accent" : "outline"}>
              {categoryKind}
            </Badge>
          </div>
        </td>
        <td className="text-muted px-3.5 py-3 align-top">
          {formatMinorUnits(plannedAmount, currency)}
        </td>
        <td className="text-muted px-3.5 py-3 align-top">
          {formatMinorUnits(actualAmount, currency)}
        </td>
        <td
          className={cn(
            "px-3.5 py-3 align-top text-sm font-semibold",
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
        <td className="px-3.5 py-3 align-top print:hidden">
          <ExpandButton
            categoryName={categoryName}
            isExpanded={isExpanded}
            onClick={() => onToggle(categoryId)}
          />
        </td>
      </tr>
      {isExpanded ? (
        <tr className="print:table-row">
          <td className="bg-panel-strong/20 px-3.5 py-3.5" colSpan={5}>
            {transactions.length === 0 ? (
              <div className="text-muted rounded-[var(--radius-control)] bg-white/35 px-3.5 py-3 text-sm leading-5">
                No transactions landed in this category for the selected month.
              </div>
            ) : (
              <List className="rounded-[var(--radius-control)]">
                {transactions.map((transaction) => (
                  <TransactionMiniRow
                    amount={formatMinorUnits(transaction.amount, currency)}
                    key={transaction.id}
                    primary={transaction.merchantRaw}
                    secondary={`${transaction.date}${transaction.notes ? ` • ${transaction.notes}` : ""}`}
                  />
                ))}
              </List>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
