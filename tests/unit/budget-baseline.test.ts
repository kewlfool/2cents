import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAppDatabase,
  ensureAppDataReady,
  getDefaultBudgetPlan,
  type TwoCentsDatabase,
} from "@/db";
import { saveBudgetBaselineDraft } from "@/features/budget/lib/budget-baseline";

describe("budget baseline persistence", () => {
  let db: TwoCentsDatabase;

  beforeEach(() => {
    db = createAppDatabase(`test-budget-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("archives removed categories and preserves their historical snapshot rows", async () => {
    await ensureAppDataReady(db);

    const activeCategories = (await db.budgetCategories.toArray()).filter(
      (category) => !category.archived,
    );
    const nextCategories = activeCategories
      .filter((category) => category.name !== "Shopping")
      .map((category) => ({
        color: category.color,
        iconKey: category.iconKey,
        id: category.id,
        kind: category.kind,
        mode: category.mode,
        name: category.name,
        plannedAmount: category.plannedAmount,
      }));

    await saveBudgetBaselineDraft(
      {
        categories: nextCategories,
        plan: {
          currency: "USD",
          monthStartDay: 1,
          name: "Updated baseline",
          notes: "Archived shopping from the active plan.",
        },
      },
      db,
    );

    const archivedShopping = (await db.budgetCategories.toArray()).find(
      (category) => category.name === "Shopping",
    );
    const marchSnapshot = await db.monthlySnapshots.get("2026-03");
    const defaultPlan = await getDefaultBudgetPlan(db);

    expect(archivedShopping?.archived).toBe(true);
    expect(defaultPlan?.name).toBe("Updated baseline");
    expect(
      marchSnapshot?.categoryBreakdown.some(
        (category) => category.categoryName === "Shopping",
      ),
    ).toBe(true);
  });
});
