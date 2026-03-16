import { createIsoTimestamp } from "@/lib/date";
import { sumMinorUnits } from "@/lib/money";
import type {
  BudgetCategory,
  MonthlySnapshot,
  MonthlySnapshotCategory,
  Transaction,
} from "@/types";

type BuildMonthlySnapshotParams = {
  categories: BudgetCategory[];
  generatedAt?: string;
  monthKey: string;
  transactions: Transaction[];
};

export function buildMonthlySnapshot({
  categories,
  generatedAt,
  monthKey,
  transactions,
}: BuildMonthlySnapshotParams): MonthlySnapshot {
  const relevantTransactions = transactions.filter(
    (transaction) => transaction.monthKey === monthKey && !transaction.ignored,
  );

  const actualIncome = sumMinorUnits(
    relevantTransactions
      .filter((transaction) => transaction.direction === "income")
      .map((transaction) => transaction.amount),
  );
  const actualExpenses = sumMinorUnits(
    relevantTransactions
      .filter((transaction) => transaction.direction === "expense")
      .map((transaction) => transaction.amount),
  );
  const plannedIncome = sumMinorUnits(
    categories
      .filter((category) => category.kind === "income" && !category.archived)
      .map((category) => category.plannedAmount),
  );
  const plannedExpenses = sumMinorUnits(
    categories
      .filter((category) => category.kind === "expense" && !category.archived)
      .map((category) => category.plannedAmount),
  );

  const actualByCategory = new Map<string, number>();

  for (const transaction of relevantTransactions) {
    if (!transaction.categoryId) {
      continue;
    }

    const currentValue = actualByCategory.get(transaction.categoryId) ?? 0;
    actualByCategory.set(
      transaction.categoryId,
      currentValue + transaction.amount,
    );
  }

  const categoryBreakdown: MonthlySnapshotCategory[] = categories
    .filter(
      (category) =>
        !category.archived ||
        relevantTransactions.some(
          (transaction) => transaction.categoryId === category.id,
        ),
    )
    .map((category) => {
      const actualAmount = actualByCategory.get(category.id) ?? 0;

      return {
        actualAmount,
        categoryId: category.id,
        categoryKind: category.kind,
        categoryName: category.name,
        plannedAmount: category.plannedAmount,
        variance: actualAmount - category.plannedAmount,
      };
    });

  const plannedSavings = plannedIncome - plannedExpenses;
  const actualSavings = actualIncome - actualExpenses;

  return {
    actualExpenses,
    actualIncome,
    actualSavings,
    categoryBreakdown,
    generatedAt: generatedAt ?? createIsoTimestamp(),
    monthKey,
    plannedExpenses,
    plannedIncome,
    plannedSavings,
    variance: actualSavings - plannedSavings,
  };
}
