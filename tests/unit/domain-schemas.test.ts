import { describe, expect, it } from "vitest";

import {
  budgetCategorySchema,
  merchantRuleSchema,
  transactionSchema,
} from "@/types";

describe("domain schemas", () => {
  it("accepts integer minor-unit money amounts for budget categories", () => {
    const category = budgetCategorySchema.parse({
      archived: false,
      color: "#356f64",
      iconKey: "briefcase",
      id: "income-salary",
      kind: "income",
      mode: "fixed",
      name: "Salary",
      plannedAmount: 520_000,
      sortOrder: 10,
    });

    expect(category.plannedAmount).toBe(520_000);
  });

  it("rejects invalid regex merchant rules", () => {
    const result = merchantRuleSchema.safeParse({
      categoryId: "category-groceries",
      createdAt: "2026-03-15T12:00:00.000Z",
      id: "rule-bad-regex",
      isCaseSensitive: false,
      matchType: "regex",
      pattern: "[unterminated",
      priority: 100,
      updatedAt: "2026-03-15T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed transaction dates", () => {
    const result = transactionSchema.safeParse({
      amount: 1_250,
      categoryId: "category-groceries",
      createdAt: "2026-03-15T12:00:00.000Z",
      date: "2026-13-40",
      direction: "expense",
      id: "transaction-invalid-date",
      ignored: false,
      merchantNormalized: "WHOLE FOODS",
      merchantRaw: "Whole Foods",
      monthKey: "2026-03",
      notes: null,
      sourceImportId: "statement-import-2026-03",
      sourceType: "statement_import",
      transferLike: false,
      updatedAt: "2026-03-15T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
