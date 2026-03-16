import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAppDatabase,
  ensureAppDataReady,
  type TwoCentsDatabase,
} from "@/db";
import {
  bulkCategorizeTransactions,
  deleteTransaction,
  saveTransaction,
} from "@/features/transactions/lib/transactions-service";
import type { MonthlySnapshot } from "@/types";

function getCategoryActualAmount(
  snapshot: MonthlySnapshot | undefined,
  categoryId: string,
) {
  return (
    snapshot?.categoryBreakdown.find((item) => item.categoryId === categoryId)
      ?.actualAmount ?? 0
  );
}

describe("transactions service", () => {
  let db: TwoCentsDatabase;

  beforeEach(() => {
    db = createAppDatabase(`test-transactions-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("creates a manual transaction and rebuilds both months when the date changes", async () => {
    await ensureAppDataReady(db);

    const [februaryBefore, marchBefore] = await Promise.all([
      db.monthlySnapshots.get("2026-02"),
      db.monthlySnapshots.get("2026-03"),
    ]);

    const createdTransaction = await saveTransaction(
      {
        amountInput: "23.45",
        categoryId: "",
        date: "2026-03-29",
        direction: "expense",
        ignored: false,
        merchantRaw: "Cash Grocer",
        notes: "",
        transferLike: false,
      },
      { db },
    );
    const marchAfterCreate = await db.monthlySnapshots.get("2026-03");

    expect(createdTransaction.sourceType).toBe("manual");
    expect(marchAfterCreate?.actualExpenses).toBe(
      (marchBefore?.actualExpenses ?? 0) + 2_345,
    );

    await saveTransaction(
      {
        amountInput: "34.56",
        categoryId: "category-groceries",
        date: "2026-02-27",
        direction: "expense",
        ignored: false,
        merchantRaw: "Cash Grocer",
        notes: "Shifted to February",
        transferLike: true,
      },
      {
        db,
        transactionId: createdTransaction.id,
      },
    );

    const [februaryAfterEdit, marchAfterEdit, storedTransaction] =
      await Promise.all([
        db.monthlySnapshots.get("2026-02"),
        db.monthlySnapshots.get("2026-03"),
        db.transactions.get(createdTransaction.id),
      ]);

    expect(storedTransaction?.monthKey).toBe("2026-02");
    expect(storedTransaction?.transferLike).toBe(true);
    expect(marchAfterEdit?.actualExpenses).toBe(marchBefore?.actualExpenses);
    expect(februaryAfterEdit?.actualExpenses).toBe(
      (februaryBefore?.actualExpenses ?? 0) + 3_456,
    );
  });

  it("bulk categorizes selected rows and rebuilds category totals after deletion", async () => {
    await ensureAppDataReady(db);

    const marchBefore = await db.monthlySnapshots.get("2026-03");
    const groceriesBefore = getCategoryActualAmount(
      marchBefore,
      "category-groceries",
    );

    const [firstTransaction, secondTransaction] = await Promise.all([
      saveTransaction(
        {
          amountInput: "10.00",
          categoryId: "",
          date: "2026-03-26",
          direction: "expense",
          ignored: false,
          merchantRaw: "Cash Market A",
          notes: "",
          transferLike: false,
        },
        { db },
      ),
      saveTransaction(
        {
          amountInput: "15.00",
          categoryId: "",
          date: "2026-03-27",
          direction: "expense",
          ignored: false,
          merchantRaw: "Cash Market B",
          notes: "",
          transferLike: false,
        },
        { db },
      ),
    ]);

    const categorizeResult = await bulkCategorizeTransactions(
      {
        categoryId: "category-groceries",
        transactionIds: [
          firstTransaction.id,
          secondTransaction.id,
          firstTransaction.id,
        ],
      },
      db,
    );
    const marchAfterCategorize = await db.monthlySnapshots.get("2026-03");

    expect(categorizeResult.updatedCount).toBe(2);
    expect(getCategoryActualAmount(marchAfterCategorize, "category-groceries")).toBe(
      groceriesBefore + 2_500,
    );

    await deleteTransaction(firstTransaction.id, db);

    const marchAfterDelete = await db.monthlySnapshots.get("2026-03");

    expect(marchAfterDelete?.actualExpenses).toBe(
      (marchBefore?.actualExpenses ?? 0) + 1_500,
    );
    expect(getCategoryActualAmount(marchAfterDelete, "category-groceries")).toBe(
      groceriesBefore + 1_500,
    );
  });
});
