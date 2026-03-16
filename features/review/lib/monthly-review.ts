import { compareMonthKeysDesc } from "@/lib/date";
import type { MonthlySnapshot, Transaction } from "@/types";

export type MonthlyReviewCategoryRow = {
  actualAmount: number;
  categoryId: string;
  categoryKind: "income" | "expense";
  categoryName: string;
  plannedAmount: number;
  transactions: Transaction[];
  variance: number;
};

export type MonthlyReviewOverspendRow = {
  actualAmount: number;
  categoryId: string;
  categoryName: string;
  plannedAmount: number;
  variance: number;
};

export type MonthlyReviewUnusualMerchantRow = {
  averagePriorAmount: number;
  currentAmount: number;
  merchantNormalized: string;
  merchantRawLabel: string;
  monthKey: string;
  reason: string;
  varianceAmount: number;
};

export type MonthlyReviewDetail = {
  categoryRows: MonthlyReviewCategoryRow[];
  overBudgetCategories: MonthlyReviewOverspendRow[];
  selectedMonthTransactions: Transaction[];
  uncategorizedTransactions: Transaction[];
  unusualMerchants: MonthlyReviewUnusualMerchantRow[];
};

function createMerchantDisplayLabel(transactions: Transaction[]) {
  return (
    transactions.find((transaction) => transaction.merchantRaw.trim())?.merchantRaw ??
    transactions[0]?.merchantNormalized ??
    "Unknown merchant"
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function buildMonthlyReviewDetail(params: {
  snapshot: MonthlySnapshot;
  transactions: Transaction[];
}) {
  const selectedMonthTransactions = params.transactions
    .filter(
      (transaction) =>
        transaction.monthKey === params.snapshot.monthKey && !transaction.ignored,
    )
    .sort((left, right) => {
      if (right.date !== left.date) {
        return right.date.localeCompare(left.date);
      }

      return right.createdAt.localeCompare(left.createdAt);
    });

  const categoryRows = params.snapshot.categoryBreakdown.map((category) => ({
    actualAmount: category.actualAmount,
    categoryId: category.categoryId,
    categoryKind: category.categoryKind,
    categoryName: category.categoryName,
    plannedAmount: category.plannedAmount,
    transactions: selectedMonthTransactions.filter(
      (transaction) => transaction.categoryId === category.categoryId,
    ),
    variance: category.variance,
  }));

  const overBudgetCategories = categoryRows
    .filter(
      (row) => row.categoryKind === "expense" && row.variance > 0 && row.actualAmount > 0,
    )
    .sort((left, right) => {
      if (right.variance !== left.variance) {
        return right.variance - left.variance;
      }

      return right.actualAmount - left.actualAmount;
    })
    .slice(0, 5)
    .map((row) => ({
      actualAmount: row.actualAmount,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      plannedAmount: row.plannedAmount,
      variance: row.variance,
    }));

  const uncategorizedTransactions = selectedMonthTransactions.filter(
    (transaction) => !transaction.categoryId,
  );

  const expenseTransactions = params.transactions.filter(
    (transaction) => !transaction.ignored && transaction.direction === "expense",
  );
  const currentMonthMerchantGroups = expenseTransactions.reduce<
    Map<string, Transaction[]>
  >((accumulator, transaction) => {
    if (transaction.monthKey !== params.snapshot.monthKey) {
      return accumulator;
    }

    const currentGroup = accumulator.get(transaction.merchantNormalized) ?? [];
    currentGroup.push(transaction);
    accumulator.set(transaction.merchantNormalized, currentGroup);
    return accumulator;
  }, new Map());

  const unusualMerchants = [...currentMonthMerchantGroups.entries()]
    .flatMap(([merchantNormalized, merchantTransactions]) => {
      const currentAmount = merchantTransactions.reduce(
        (total, transaction) => total + transaction.amount,
        0,
      );
      const priorMonthTotals = expenseTransactions
        .filter(
          (transaction) =>
            transaction.merchantNormalized === merchantNormalized &&
            transaction.monthKey !== params.snapshot.monthKey &&
            compareMonthKeysDesc(params.snapshot.monthKey, transaction.monthKey) < 0,
        )
        .reduce<Map<string, number>>((accumulator, transaction) => {
          accumulator.set(
            transaction.monthKey,
            (accumulator.get(transaction.monthKey) ?? 0) + transaction.amount,
          );
          return accumulator;
        }, new Map());
      const priorAmounts = [...priorMonthTotals.values()];
      const averagePriorAmount = average(priorAmounts);
      const varianceAmount = currentAmount - averagePriorAmount;

      if (priorAmounts.length === 0) {
        if (currentAmount < 2_000) {
          return [];
        }

        return [
          {
            averagePriorAmount: 0,
            currentAmount,
            merchantNormalized,
            merchantRawLabel: createMerchantDisplayLabel(merchantTransactions),
            monthKey: params.snapshot.monthKey,
            reason: "New this month",
            varianceAmount: currentAmount,
          } satisfies MonthlyReviewUnusualMerchantRow,
        ];
      }

      const threshold = Math.max(1_000, Math.round(averagePriorAmount * 0.5));

      if (varianceAmount < threshold) {
        return [];
      }

      return [
        {
          averagePriorAmount,
          currentAmount,
          merchantNormalized,
          merchantRawLabel: createMerchantDisplayLabel(merchantTransactions),
          monthKey: params.snapshot.monthKey,
          reason: "Higher than recent average",
          varianceAmount,
        } satisfies MonthlyReviewUnusualMerchantRow,
      ];
    })
    .sort((left, right) => {
      if (right.varianceAmount !== left.varianceAmount) {
        return right.varianceAmount - left.varianceAmount;
      }

      return right.currentAmount - left.currentAmount;
    })
    .slice(0, 5);

  return {
    categoryRows,
    overBudgetCategories,
    selectedMonthTransactions,
    uncategorizedTransactions,
    unusualMerchants,
  } satisfies MonthlyReviewDetail;
}
