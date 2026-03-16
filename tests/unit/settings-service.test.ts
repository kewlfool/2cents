import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAppDatabase,
  ensureAppDataReady,
  type TwoCentsDatabase,
} from "@/db";
import { saveAppPreferences } from "@/features/settings/lib/settings-service";

describe("settings service", () => {
  let db: TwoCentsDatabase;

  beforeEach(() => {
    db = createAppDatabase(`test-settings-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("saves preferences and reassigns transaction months when the month start changes", async () => {
    await ensureAppDataReady(db);

    const [februaryBefore, marchBefore] = await Promise.all([
      db.monthlySnapshots.get("2026-02"),
      db.monthlySnapshots.get("2026-03"),
    ]);

    const result = await saveAppPreferences(
      {
        currency: "CAD",
        monthStartDay: 15,
      },
      db,
    );

    const [
      storedSettings,
      storedPlan,
      movedTransaction,
      movedImportedTransaction,
      updatedMarchImport,
      februaryAfter,
      marchAfter,
    ] = await Promise.all([
      db.appSettings.get("app-settings"),
      db.budgetPlans.get("budget-plan-baseline"),
      db.transactions.get("transaction-2026-03-salary"),
      db.transactions.get("transaction-2026-03-sweetgreen"),
      db.statementImports.get("statement-import-2026-03"),
      db.monthlySnapshots.get("2026-02"),
      db.monthlySnapshots.get("2026-03"),
    ]);

    expect(result.settings.currency).toBe("CAD");
    expect(storedSettings?.monthStartDay).toBe(15);
    expect(storedPlan?.currency).toBe("CAD");
    expect(storedPlan?.monthStartDay).toBe(15);
    expect(movedTransaction?.monthKey).toBe("2026-02");
    expect(movedImportedTransaction?.monthKey).toBe("2026-02");
    expect(updatedMarchImport?.monthKey).toBe("2026-03");
    expect(februaryAfter?.actualIncome).toBe(februaryBefore?.actualIncome);
    expect(marchAfter?.actualIncome).toBe(
      (marchBefore?.actualIncome ?? 0) - 520_000,
    );
  });
});
