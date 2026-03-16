import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAppDatabase,
  ensureAppDataReady,
  exportAppData,
  getDashboardSummary,
  importAppData,
  resetAppData,
  type TwoCentsDatabase,
} from "@/db";

describe("IndexedDB bootstrap and backup", () => {
  let db: TwoCentsDatabase;

  beforeEach(() => {
    db = createAppDatabase(`test-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("seeds the demo data exactly once", async () => {
    const firstBootstrap = await ensureAppDataReady(db);
    const secondBootstrap = await ensureAppDataReady(db);
    const summary = await getDashboardSummary(db);

    expect(firstBootstrap.seededDemoData).toBe(true);
    expect(secondBootstrap.seededDemoData).toBe(false);
    expect(summary.activeBudgetName).toBe("Baseline household budget");
    expect(summary.categoryCount).toBe(10);
    expect(summary.transactionCount).toBeGreaterThan(20);
    expect(summary.latestMonthKey).toBe("2026-03");
  });

  it("exports and restores the local dataset", async () => {
    await ensureAppDataReady(db);

    const backup = await exportAppData(db);

    await resetAppData({ reseedDemoData: false }, db);
    expect(await db.transactions.count()).toBe(0);
    expect(await db.budgetPlans.count()).toBe(0);

    await importAppData(backup, db);

    expect(await db.transactions.count()).toBe(backup.data.transactions.length);
    expect(await db.budgetPlans.count()).toBe(backup.data.budgetPlans.length);
    expect(await db.monthlySnapshots.count()).toBe(
      backup.data.monthlySnapshots.length,
    );
  });
});
