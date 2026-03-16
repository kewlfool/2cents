import { appBackupDataSchema, type AppBackupData } from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";
import { createDemoSeedData } from "@/db/seed/demo-data";

type BootstrapResult = {
  seededDemoData: boolean;
};

const bootstrapTasks = new WeakMap<
  TwoCentsDatabase,
  Promise<BootstrapResult>
>();

function getAllTables(db: TwoCentsDatabase) {
  return [
    db.appSettings,
    db.budgetPlans,
    db.budgetCategories,
    db.statementImports,
    db.transactions,
    db.merchantRules,
    db.monthlySnapshots,
  ] as const;
}

async function hasExistingAppData(db: TwoCentsDatabase) {
  const counts = await Promise.all([
    db.appSettings.count(),
    db.budgetPlans.count(),
    db.budgetCategories.count(),
    db.transactions.count(),
    db.merchantRules.count(),
  ]);

  return counts.some((count) => count > 0);
}

async function seedDemoData(db: TwoCentsDatabase): Promise<BootstrapResult> {
  const alreadySeeded = await hasExistingAppData(db);

  if (alreadySeeded) {
    return { seededDemoData: false };
  }

  const seedData = createDemoSeedData();

  await db.transaction("rw", getAllTables(db), async () => {
    if (await hasExistingAppData(db)) {
      return;
    }

    await db.budgetCategories.bulkAdd(seedData.budgetCategories);
    await db.budgetPlans.add(seedData.budgetPlan);
    await db.statementImports.bulkAdd(seedData.statementImports);
    await db.transactions.bulkAdd(seedData.transactions);
    await db.merchantRules.bulkAdd(seedData.merchantRules);
    await db.monthlySnapshots.bulkAdd(seedData.monthlySnapshots);
    await db.appSettings.add(seedData.appSettings);
  });

  return { seededDemoData: true };
}

export async function ensureAppDataReady(
  db: TwoCentsDatabase = getAppDatabase(),
): Promise<BootstrapResult> {
  const existingTask = bootstrapTasks.get(db);

  if (existingTask) {
    return existingTask;
  }

  const task = seedDemoData(db).finally(() => {
    bootstrapTasks.delete(db);
  });

  bootstrapTasks.set(db, task);

  return task;
}

export async function replaceAllAppData(
  data: AppBackupData,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedData = appBackupDataSchema.parse(data);

  await db.transaction("rw", getAllTables(db), async () => {
    for (const table of getAllTables(db)) {
      await table.clear();
    }

    if (parsedData.budgetCategories.length > 0) {
      await db.budgetCategories.bulkAdd(parsedData.budgetCategories);
    }

    if (parsedData.budgetPlans.length > 0) {
      await db.budgetPlans.bulkAdd(parsedData.budgetPlans);
    }

    if (parsedData.statementImports.length > 0) {
      await db.statementImports.bulkAdd(parsedData.statementImports);
    }

    if (parsedData.transactions.length > 0) {
      await db.transactions.bulkAdd(parsedData.transactions);
    }

    if (parsedData.merchantRules.length > 0) {
      await db.merchantRules.bulkAdd(parsedData.merchantRules);
    }

    if (parsedData.monthlySnapshots.length > 0) {
      await db.monthlySnapshots.bulkAdd(parsedData.monthlySnapshots);
    }

    if (parsedData.appSettings.length > 0) {
      await db.appSettings.bulkAdd(parsedData.appSettings);
    }
  });
}

export async function resetAppData(
  options: { reseedDemoData?: boolean } = {},
  db: TwoCentsDatabase = getAppDatabase(),
) {
  await db.transaction("rw", getAllTables(db), async () => {
    for (const table of getAllTables(db)) {
      await table.clear();
    }
  });

  if (options.reseedDemoData ?? true) {
    await ensureAppDataReady(db);
  }
}

export type { BootstrapResult };
