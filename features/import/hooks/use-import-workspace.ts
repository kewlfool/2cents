"use client";

import { useLiveQuery } from "dexie-react-hooks";

import {
  getAppDatabase,
  getAppSettings,
  listBudgetCategories,
  listMerchantRules,
  listStatementImports,
} from "@/db";

async function getImportWorkspaceData() {
  const db = getAppDatabase();
  const [settings, categories, rules, statementImports, transactions] =
    await Promise.all([
      getAppSettings(db),
      listBudgetCategories(db),
      listMerchantRules(db),
      listStatementImports(db),
      db.transactions.toArray(),
    ]);

  return {
    categories: categories.filter((category) => !category.archived),
    locale: settings?.locale ?? "en-US",
    monthStartDay: settings?.monthStartDay ?? 1,
    rules,
    statementImports,
    transactions,
  };
}

export function useImportWorkspace() {
  return useLiveQuery(() => getImportWorkspaceData(), [], null);
}
