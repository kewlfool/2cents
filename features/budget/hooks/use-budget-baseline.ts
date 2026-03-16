"use client";

import { useLiveQuery } from "dexie-react-hooks";

import {
  getAppSettings,
  getDefaultBudgetPlan,
  listBudgetCategories,
} from "@/db";

export function useBudgetBaseline() {
  return useLiveQuery(async () => {
    const [plan, categories, settings] = await Promise.all([
      getDefaultBudgetPlan(),
      listBudgetCategories(),
      getAppSettings(),
    ]);

    return {
      categories,
      plan,
      settings,
    };
  }, []);
}
