import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAppDatabase,
  ensureAppDataReady,
  type TwoCentsDatabase,
} from "@/db";
import { previewMerchantRuleApplications } from "@/features/rules/lib/rule-application";
import {
  applyMerchantRulePreview,
  saveMerchantRuleFromCorrection,
} from "@/features/rules/lib/rules-service";

describe("rules service", () => {
  let db: TwoCentsDatabase;

  beforeEach(() => {
    db = createAppDatabase(`test-rules-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("creates an exact rule from a correction and applies it to uncategorized transactions", async () => {
    await ensureAppDataReady(db);

    const groceriesCategory = await db.budgetCategories.get("category-groceries");

    if (!groceriesCategory) {
      throw new Error("Expected seeded groceries category.");
    }

    const createdRule = await saveMerchantRuleFromCorrection(
      {
        categoryId: groceriesCategory.id,
        transaction: {
          amount: 2_345,
          categoryId: null,
          date: "2026-03-28",
          direction: "expense",
          fingerprint: "2026-03-28|expense|2345|CORNER MARKET",
          matchedRuleId: null,
          matchedRuleLabel: null,
          merchantNormalized: "CORNER MARKET",
          merchantRaw: "Corner Market",
          monthKey: "2026-03",
          notes: null,
          transferLike: false,
        },
      },
      db,
    );

    expect(createdRule.rule.matchType).toBe("exact");
    expect(createdRule.rule.pattern).toBe("CORNER MARKET");

    await db.transactions.put({
      amount: 2_345,
      categoryId: null,
      createdAt: "2026-03-15T12:00:00.000Z",
      date: "2026-03-28",
      direction: "expense",
      id: "transaction-corner-market",
      ignored: false,
      merchantNormalized: "CORNER MARKET",
      merchantRaw: "Corner Market",
      monthKey: "2026-03",
      notes: null,
      sourceImportId: null,
      sourceType: "manual",
      transferLike: false,
      updatedAt: "2026-03-15T12:00:00.000Z",
    });

    const [categories, rules, transactions] = await Promise.all([
      db.budgetCategories.toArray(),
      db.merchantRules.toArray(),
      db.transactions.toArray(),
    ]);
    const previewRows = previewMerchantRuleApplications({
      categories,
      rules,
      transactions,
    });

    const result = await applyMerchantRulePreview(previewRows, db);
    const updatedTransaction = await db.transactions.get("transaction-corner-market");

    expect(result.updatedCount).toBeGreaterThan(0);
    expect(updatedTransaction?.categoryId).toBe(groceriesCategory.id);
  });
});
