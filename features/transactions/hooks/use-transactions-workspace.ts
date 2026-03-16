"use client";

import { useLiveQuery } from "dexie-react-hooks";

import {
  getAppDatabase,
  getAppSettings,
  getDefaultBudgetPlan,
  listBudgetCategories,
  listStatementImports,
  listTransactions,
} from "@/db";

async function getTransactionsWorkspaceData() {
  const db = getAppDatabase();
  const [settings, budgetPlan, categories, statementImports, transactions] =
    await Promise.all([
      getAppSettings(db),
      getDefaultBudgetPlan(db),
      listBudgetCategories(db),
      listStatementImports(db),
      listTransactions(db),
    ]);

  return {
    categories,
    currency: settings?.currency ?? budgetPlan?.currency ?? "USD",
    locale: settings?.locale ?? "en-US",
    monthStartDay: settings?.monthStartDay ?? budgetPlan?.monthStartDay ?? 1,
    statementImports,
    transactions,
  };
}

export function useTransactionsWorkspace() {
  return useLiveQuery(() => getTransactionsWorkspaceData(), [], null);
}
