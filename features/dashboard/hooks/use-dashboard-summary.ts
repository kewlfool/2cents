"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { getDashboardSummary } from "@/db";

export function useDashboardSummary() {
  return useLiveQuery(() => getDashboardSummary(), [], null);
}
