"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { getAppDatabase, listBudgetCategories, listMerchantRules } from "@/db";

async function getRulesWorkspaceData() {
  const db = getAppDatabase();
  const [categories, rules, transactions] = await Promise.all([
    listBudgetCategories(db),
    listMerchantRules(db),
    db.transactions.toArray(),
  ]);

  return {
    categories: categories.filter((category) => !category.archived),
    rules,
    transactions,
  };
}

export function useRulesWorkspace() {
  return useLiveQuery(() => getRulesWorkspaceData(), [], null);
}
