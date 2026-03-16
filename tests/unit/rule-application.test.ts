import { describe, expect, it } from "vitest";

import { previewMerchantRuleApplications } from "@/features/rules/lib/rule-application";
import type { BudgetCategory, MerchantRule, Transaction } from "@/types";

const createdAt = "2026-03-15T12:00:00.000Z";

const categories: BudgetCategory[] = [
  {
    archived: false,
    color: "#597a4b",
    iconKey: "shopping-basket",
    id: "category-groceries",
    kind: "expense",
    mode: "variable",
    name: "Groceries",
    plannedAmount: 65_000,
    sortOrder: 10,
  },
];

const rules: MerchantRule[] = [
  {
    categoryId: "category-groceries",
    createdAt,
    id: "rule-groceries",
    isCaseSensitive: false,
    matchType: "contains",
    pattern: "WHOLE FOODS",
    priority: 100,
    updatedAt: createdAt,
  },
];

const transactions: Transaction[] = [
  {
    amount: 1_234,
    categoryId: null,
    createdAt,
    date: "2026-03-15",
    direction: "expense",
    id: "transaction-uncategorized",
    ignored: false,
    merchantNormalized: "WHOLE FOODS MARKET",
    merchantRaw: "Whole Foods Market",
    monthKey: "2026-03",
    notes: null,
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
  {
    amount: 995,
    categoryId: "category-groceries",
    createdAt,
    date: "2026-03-16",
    direction: "expense",
    id: "transaction-already-categorized",
    ignored: false,
    merchantNormalized: "WHOLE FOODS MARKET",
    merchantRaw: "Whole Foods Market",
    monthKey: "2026-03",
    notes: null,
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
];

describe("rule application preview", () => {
  it("only proposes matches for uncategorized transactions", () => {
    const previewRows = previewMerchantRuleApplications({
      categories,
      rules,
      transactions,
    });

    expect(previewRows).toHaveLength(1);
    expect(previewRows[0]?.transactionId).toBe("transaction-uncategorized");
    expect(previewRows[0]?.categoryName).toBe("Groceries");
  });
});
