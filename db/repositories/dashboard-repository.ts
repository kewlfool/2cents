import { compareMonthKeysDesc, getCurrentMonthKey } from "@/lib/date";
import {
  monthlySnapshotSchema,
  statementImportSchema,
  type MonthlySnapshot,
  type StatementImport,
} from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";
import { getAppSettings } from "@/db/repositories/app-settings-repository";
import {
  countBudgetCategories,
  getDefaultBudgetPlan,
} from "@/db/repositories/budget-repository";
import { countMerchantRules } from "@/db/repositories/rules-repository";
import {
  countStatementImports,
  countTransactions,
} from "@/db/repositories/transactions-repository";

export type DashboardSummary = {
  activeBudgetName: string | null;
  categoryCount: number;
  currentMonthKey: string | null;
  currentSnapshot: MonthlySnapshot | null;
  currency: string;
  importCount: number;
  latestMonthKey: string | null;
  latestSnapshot: MonthlySnapshot | null;
  monthStartDay: number;
  monthCount: number;
  overBudgetCategories: Array<{
    actualAmount: number;
    categoryId: string;
    categoryName: string;
    plannedAmount: number;
    variance: number;
  }>;
  recentImports: StatementImport[];
  ruleCount: number;
  seededAt: string | null;
  transactionCount: number;
  uncategorizedCount: number;
};

export async function getDashboardSummary(
  db: TwoCentsDatabase = getAppDatabase(),
): Promise<DashboardSummary> {
  const [
    settings,
    defaultBudgetPlan,
    categoryCount,
    transactionCount,
    importCount,
    ruleCount,
    snapshots,
    statementImports,
    transactions,
  ] = await Promise.all([
    getAppSettings(db),
    getDefaultBudgetPlan(db),
    countBudgetCategories(db),
    countTransactions(db),
    countStatementImports(db),
    countMerchantRules(db),
    db.monthlySnapshots.toArray(),
    db.statementImports.toArray(),
    db.transactions.toArray(),
  ]);

  const orderedSnapshots = snapshots.sort((left, right) =>
    compareMonthKeysDesc(left.monthKey, right.monthKey),
  );
  const latestSnapshot = orderedSnapshots[0]
    ? monthlySnapshotSchema.parse(orderedSnapshots[0])
    : null;
  const monthStartDay = settings?.monthStartDay ?? defaultBudgetPlan?.monthStartDay ?? 1;
  const currentMonthKey = getCurrentMonthKey(new Date(), monthStartDay);
  const currentSnapshotCandidate =
    orderedSnapshots.find((snapshot) => snapshot.monthKey === currentMonthKey) ??
    null;
  const currentSnapshot = currentSnapshotCandidate
    ? monthlySnapshotSchema.parse(currentSnapshotCandidate)
    : latestSnapshot;
  const resolvedMonthKey = currentSnapshot?.monthKey ?? null;
  const uncategorizedCount = resolvedMonthKey
    ? transactions.filter(
        (transaction) =>
          transaction.monthKey === resolvedMonthKey &&
          !transaction.ignored &&
          !transaction.categoryId,
      ).length
    : 0;
  const overBudgetCategories =
    currentSnapshot?.categoryBreakdown
      .filter(
        (category) =>
          category.categoryKind === "expense" && category.variance > 0,
      )
      .sort((left, right) => {
        if (right.variance !== left.variance) {
          return right.variance - left.variance;
        }

        return right.actualAmount - left.actualAmount;
      })
      .slice(0, 3)
      .map((category) => ({
        actualAmount: category.actualAmount,
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        plannedAmount: category.plannedAmount,
        variance: category.variance,
      })) ?? [];
  const recentImports = statementImports
    .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
    .slice(0, 3)
    .map((statementImport) => statementImportSchema.parse(statementImport));

  return {
    activeBudgetName: defaultBudgetPlan?.name ?? null,
    categoryCount,
    currentMonthKey: resolvedMonthKey,
    currentSnapshot,
    currency: settings?.currency ?? defaultBudgetPlan?.currency ?? "USD",
    importCount,
    latestMonthKey: latestSnapshot?.monthKey ?? null,
    latestSnapshot,
    monthStartDay,
    monthCount: orderedSnapshots.length,
    overBudgetCategories,
    recentImports,
    ruleCount,
    seededAt: settings?.demoDataSeededAt ?? null,
    transactionCount,
    uncategorizedCount,
  };
}
