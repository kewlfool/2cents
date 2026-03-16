import { describe, expect, it } from "vitest";

import { buildMonthlyReviewDetail } from "@/features/review/lib/monthly-review";
import type { MonthlySnapshot, Transaction } from "@/types";

const createdAt = "2026-03-15T12:00:00.000Z";

const snapshot: MonthlySnapshot = {
  actualExpenses: 12_500,
  actualIncome: 40_000,
  actualSavings: 27_500,
  categoryBreakdown: [
    {
      actualAmount: 9_000,
      categoryId: "category-groceries",
      categoryKind: "expense",
      categoryName: "Groceries",
      plannedAmount: 6_500,
      variance: 2_500,
    },
    {
      actualAmount: 3_500,
      categoryId: "category-dining",
      categoryKind: "expense",
      categoryName: "Dining",
      plannedAmount: 4_000,
      variance: -500,
    },
  ],
  generatedAt: createdAt,
  monthKey: "2026-03",
  plannedExpenses: 10_500,
  plannedIncome: 40_000,
  plannedSavings: 29_500,
  variance: -2_000,
};

const transactions: Transaction[] = [
  {
    amount: 9_000,
    categoryId: "category-groceries",
    createdAt,
    date: "2026-03-05",
    direction: "expense",
    id: "transaction-current-groceries",
    ignored: false,
    merchantNormalized: "WHOLE FOODS",
    merchantRaw: "Whole Foods Market",
    monthKey: "2026-03",
    notes: null,
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
  {
    amount: 3_500,
    categoryId: "category-dining",
    createdAt,
    date: "2026-03-10",
    direction: "expense",
    id: "transaction-current-dining",
    ignored: false,
    merchantNormalized: "PIZZA NORTH",
    merchantRaw: "Pizza North",
    monthKey: "2026-03",
    notes: null,
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
  {
    amount: 3_000,
    categoryId: "category-groceries",
    createdAt,
    date: "2026-02-05",
    direction: "expense",
    id: "transaction-prior-groceries",
    ignored: false,
    merchantNormalized: "WHOLE FOODS",
    merchantRaw: "Whole Foods Market",
    monthKey: "2026-02",
    notes: null,
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
];

describe("monthly review detail", () => {
  it("surfaces over-budget categories and unusual merchants", () => {
    const detail = buildMonthlyReviewDetail({
      snapshot,
      transactions,
    });

    expect(detail.categoryRows).toHaveLength(2);
    expect(detail.overBudgetCategories[0]?.categoryName).toBe("Groceries");
    expect(detail.overBudgetCategories[0]?.variance).toBe(2_500);
    expect(detail.unusualMerchants[0]?.merchantNormalized).toBe("WHOLE FOODS");
    expect(detail.unusualMerchants[0]?.reason).toBe("Higher than recent average");
  });
});
