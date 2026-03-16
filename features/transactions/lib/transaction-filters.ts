import { compareMonthKeysDesc } from "@/lib/date";
import type { Transaction } from "@/types";

export type IgnoredFilterMode = "active" | "all" | "ignored";

export type TransactionFilters = {
  categoryId: string;
  direction: "all" | Transaction["direction"];
  ignoredMode: IgnoredFilterMode;
  monthKey: string;
  onlyUncategorized: boolean;
  searchQuery: string;
};

export function createDefaultTransactionFilters(
  defaultMonthKey: string | null = null,
): TransactionFilters {
  return {
    categoryId: "all",
    direction: "all",
    ignoredMode: "active",
    monthKey: defaultMonthKey ?? "all",
    onlyUncategorized: false,
    searchQuery: "",
  };
}

export function collectTransactionMonthKeys(transactions: Transaction[]) {
  return Array.from(
    new Set(transactions.map((transaction) => transaction.monthKey)),
  ).sort(compareMonthKeysDesc);
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
) {
  const normalizedSearchQuery = filters.searchQuery.trim().toUpperCase();

  return [...transactions]
    .filter((transaction) => {
      if (filters.monthKey !== "all" && transaction.monthKey !== filters.monthKey) {
        return false;
      }

      if (filters.categoryId !== "all" && transaction.categoryId !== filters.categoryId) {
        return false;
      }

      if (filters.direction !== "all" && transaction.direction !== filters.direction) {
        return false;
      }

      if (filters.ignoredMode === "active" && transaction.ignored) {
        return false;
      }

      if (filters.ignoredMode === "ignored" && !transaction.ignored) {
        return false;
      }

      if (filters.onlyUncategorized && transaction.categoryId) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableFields = [
        transaction.date,
        transaction.merchantNormalized,
        transaction.merchantRaw,
        transaction.notes ?? "",
      ]
        .join(" ")
        .toUpperCase();

      return searchableFields.includes(normalizedSearchQuery);
    })
    .sort((left, right) => {
      const dateComparison = right.date.localeCompare(left.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);

      if (updatedComparison !== 0) {
        return updatedComparison;
      }

      return left.merchantNormalized.localeCompare(right.merchantNormalized);
    });
}
