import { describe, expect, it } from "vitest";

import {
  buildStatementImportPreview,
  createStatementFingerprint,
  createStatementImportMapping,
  normalizeStatementDate,
} from "@/features/import/lib/statement-import";
import { normalizeMerchantName } from "@/features/import/lib/merchant-normalization";
import type {
  BudgetCategory,
  MerchantRule,
  StatementImport,
  Transaction,
} from "@/types";

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
  {
    archived: false,
    color: "#7a4f43",
    iconKey: "utensils",
    id: "category-dining",
    kind: "expense",
    mode: "variable",
    name: "Dining",
    plannedAmount: 22_000,
    sortOrder: 20,
  },
];

const rules: MerchantRule[] = [
  {
    categoryId: "category-dining",
    createdAt,
    id: "rule-broad",
    isCaseSensitive: false,
    matchType: "contains",
    pattern: "BLUE",
    priority: 10,
    updatedAt: createdAt,
  },
  {
    categoryId: "category-groceries",
    createdAt,
    id: "rule-specific",
    isCaseSensitive: false,
    matchType: "contains",
    pattern: "WHOLE FOODS",
    priority: 100,
    updatedAt: createdAt,
  },
];

const existingImports: StatementImport[] = [];

const existingTransactions: Transaction[] = [
  {
    amount: 1_234,
    categoryId: "category-groceries",
    createdAt,
    date: "2026-03-20",
    direction: "expense",
    id: "existing-transaction",
    ignored: false,
    merchantNormalized: "WHOLE FOODS",
    merchantRaw: "Whole Foods",
    monthKey: "2026-03",
    notes: null,
    sourceImportId: "import-existing",
    sourceType: "statement_import",
    transferLike: false,
    updatedAt: createdAt,
  },
];

describe("statement import helpers", () => {
  it("normalizes merchant names and dates", () => {
    expect(normalizeMerchantName("POS Debit Whole Foods #12345")).toBe(
      "WHOLE FOODS",
    );
    expect(normalizeStatementDate("3/15/2026")).toBe("2026-03-15");
    expect(normalizeStatementDate("2026-02-30")).toBeNull();
  });

  it("auto-maps common statement headers", () => {
    const mapping = createStatementImportMapping(["Posted Date", "Description", "Amount"]);

    expect(mapping.date).toBe("Posted Date");
    expect(mapping.merchant).toBe("Description");
    expect(mapping.amount).toBe("Amount");
  });

  it("auto-maps bank exports with description splits and currency headers", () => {
    const mapping = createStatementImportMapping([
      "Account Type",
      "Transaction Date",
      "Description 1",
      "Description 2",
      "CAD$",
      "USD$",
    ]);

    expect(mapping.date).toBe("Transaction Date");
    expect(mapping.merchant).toBe("Description 1");
    expect(mapping.notes).toBe("Description 2");
    expect(mapping.amount).toBe("CAD$");
  });

  it("creates stable duplicate fingerprints", () => {
    expect(
      createStatementFingerprint({
        amount: 1_234,
        date: "2026-03-20",
        direction: "expense",
        merchantNormalized: "WHOLE FOODS",
      }),
    ).toBe("2026-03-20|expense|1234|WHOLE FOODS");
  });

  it("stages ready rows, matches rules, and skips duplicates", () => {
    const preview = buildStatementImportPreview({
      categories,
      existingImports,
      existingTransactions,
      mapping: createStatementImportMapping(["Date", "Merchant", "Amount"]),
      rules,
      source: {
        checksum: "stmt-test",
        fileName: "statement.csv",
        headers: ["Date", "Merchant", "Amount"],
        rows: [
          {
            Amount: "12.34",
            Date: "03/20/2026",
            Merchant: "Whole Foods",
          },
          {
            Amount: "18.42",
            Date: "03/21/2026",
            Merchant: "Whole Foods Market",
          },
          {
            Amount: "4.50",
            Date: "03/22/2026",
            Merchant: "Corner Market",
          },
        ],
        sourceFormat: "csv",
      },
    });

    expect(preview.readyRowCount).toBe(2);
    expect(preview.duplicateRowCount).toBe(1);
    expect(preview.rows[1]?.transaction?.categoryId).toBe("category-groceries");
    expect(preview.rows[2]?.transaction?.categoryId).toBeNull();
  });
});
