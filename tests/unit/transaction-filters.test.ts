import { describe, expect, it } from "vitest";

import {
  collectTransactionMonthKeys,
  createDefaultTransactionFilters,
  filterTransactions,
} from "@/features/transactions/lib/transaction-filters";
import type { Transaction } from "@/types";

const createdAt = "2026-03-15T12:00:00.000Z";

const transactions: Transaction[] = [
  {
    amount: 2_450,
    categoryId: "category-groceries",
    createdAt,
    date: "2026-03-14",
    direction: "expense",
    id: "transaction-groceries",
    ignored: false,
    merchantNormalized: "WHOLE FOODS",
    merchantRaw: "Whole Foods Market",
    monthKey: "2026-03",
    notes: "Weekly shop",
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
  {
    amount: 875,
    categoryId: null,
    createdAt,
    date: "2026-03-12",
    direction: "expense",
    id: "transaction-corner",
    ignored: false,
    merchantNormalized: "CORNER MARKET",
    merchantRaw: "Corner Market",
    monthKey: "2026-03",
    notes: null,
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
  {
    amount: 125_000,
    categoryId: "category-salary",
    createdAt,
    date: "2026-02-28",
    direction: "income",
    id: "transaction-salary",
    ignored: true,
    merchantNormalized: "ACME PAYROLL",
    merchantRaw: "Acme Payroll",
    monthKey: "2026-02",
    notes: "Ignore duplicate payroll test row",
    sourceImportId: null,
    sourceType: "manual",
    transferLike: false,
    updatedAt: createdAt,
  },
];

describe("transaction filters", () => {
  it("collects descending month keys from the ledger", () => {
    expect(collectTransactionMonthKeys(transactions)).toEqual([
      "2026-03",
      "2026-02",
    ]);
  });

  it("filters by month, uncategorized state, search query, and ignored mode", () => {
    const defaultFilters = createDefaultTransactionFilters("2026-03");

    expect(filterTransactions(transactions, defaultFilters).map((item) => item.id)).toEqual([
      "transaction-groceries",
      "transaction-corner",
    ]);

    expect(
      filterTransactions(transactions, {
        ...defaultFilters,
        onlyUncategorized: true,
      }).map((item) => item.id),
    ).toEqual(["transaction-corner"]);

    expect(
      filterTransactions(transactions, {
        ...defaultFilters,
        searchQuery: "whole",
      }).map((item) => item.id),
    ).toEqual(["transaction-groceries"]);

    expect(
      filterTransactions(transactions, {
        ...defaultFilters,
        direction: "income",
        ignoredMode: "all",
        monthKey: "all",
      }).map((item) => item.id),
    ).toEqual(["transaction-salary"]);

    expect(
      filterTransactions(transactions, {
        ...defaultFilters,
        ignoredMode: "ignored",
        monthKey: "all",
      }).map((item) => item.id),
    ).toEqual(["transaction-salary"]);
  });
});
