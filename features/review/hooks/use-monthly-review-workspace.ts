"use client";

import { useLiveQuery } from "dexie-react-hooks";

import {
  getAppDatabase,
  getAppSettings,
  getDefaultBudgetPlan,
  listMonthlySnapshots,
} from "@/db";
import { compareMonthKeysDesc } from "@/lib/date";

async function getMonthlyReviewWorkspaceData() {
  const db = getAppDatabase();
  const [settings, budgetPlan, snapshots, transactions] = await Promise.all([
    getAppSettings(db),
    getDefaultBudgetPlan(db),
    listMonthlySnapshots(db),
    db.transactions.toArray(),
  ]);

  return {
    budgetPlan,
    currency: settings?.currency ?? budgetPlan?.currency ?? "USD",
    locale: settings?.locale ?? "en-US",
    monthStartDay: settings?.monthStartDay ?? budgetPlan?.monthStartDay ?? 1,
    snapshots: snapshots.sort((left, right) =>
      compareMonthKeysDesc(left.monthKey, right.monthKey),
    ),
    transactions,
  };
}

export function useMonthlyReviewWorkspace() {
  return useLiveQuery(() => getMonthlyReviewWorkspaceData(), [], null);
}
