import { monthlySnapshotSchema, type MonthlySnapshot } from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";

export async function getLatestMonthlySnapshot(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const snapshots = await db.monthlySnapshots.toArray();
  const latestSnapshot =
    snapshots.sort((left, right) =>
      right.monthKey.localeCompare(left.monthKey),
    )[0] ?? null;

  return latestSnapshot ? monthlySnapshotSchema.parse(latestSnapshot) : null;
}

export async function listMonthlySnapshots(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const snapshots = await db.monthlySnapshots.toArray();
  return snapshots.map((snapshot) => monthlySnapshotSchema.parse(snapshot));
}

export async function bulkPutMonthlySnapshots(
  snapshots: MonthlySnapshot[],
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedSnapshots = snapshots.map((snapshot) =>
    monthlySnapshotSchema.parse(snapshot),
  );
  await db.monthlySnapshots.bulkPut(parsedSnapshots);
  return parsedSnapshots;
}
