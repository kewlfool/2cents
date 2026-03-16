import { buildMonthlySnapshot } from "@/lib/monthly-snapshots";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";

export async function rebuildMonthlySnapshotsForMonths(
  monthKeys: string[],
  generatedAt: string,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const uniqueMonthKeys = Array.from(new Set(monthKeys)).sort();

  if (uniqueMonthKeys.length === 0) {
    return;
  }

  const [categories, transactions] = await Promise.all([
    db.budgetCategories.toArray(),
    db.transactions.toArray(),
  ]);

  const snapshots = uniqueMonthKeys.map((monthKey) =>
    buildMonthlySnapshot({
      categories,
      generatedAt,
      monthKey,
      transactions,
    }),
  );

  await db.monthlySnapshots.bulkPut(snapshots);
}
