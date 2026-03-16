"use client";

import { useLiveQuery } from "dexie-react-hooks";

import {
  getAppDatabase,
  getAppSettings,
  getDefaultBudgetPlan,
  listMonthlySnapshots,
} from "@/db";
import { compareMonthKeysDesc } from "@/lib/date";

async function getSettingsWorkspaceData() {
  const db = getAppDatabase();
  const [settings, budgetPlan, statementImports, transactions, rules, snapshots] =
    await Promise.all([
      getAppSettings(db),
      getDefaultBudgetPlan(db),
      db.statementImports.toArray(),
      db.transactions.toArray(),
      db.merchantRules.toArray(),
      listMonthlySnapshots(db),
    ]);

  const orderedSnapshots = snapshots.sort((left, right) =>
    compareMonthKeysDesc(left.monthKey, right.monthKey),
  );

  return {
    budgetPlan,
    counts: {
      imports: statementImports.length,
      months: orderedSnapshots.length,
      rules: rules.length,
      transactions: transactions.length,
    },
    latestMonthKey: orderedSnapshots[0]?.monthKey ?? null,
    settings,
  };
}

export function useSettingsWorkspace() {
  return useLiveQuery(() => getSettingsWorkspaceData(), [], null);
}
