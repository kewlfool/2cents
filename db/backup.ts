import { appBackupSchema, type AppBackup } from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";
import { replaceAllAppData } from "@/db/bootstrap";

export async function exportAppData(
  db: TwoCentsDatabase = getAppDatabase(),
): Promise<AppBackup> {
  const [
    appSettings,
    budgetCategories,
    budgetPlans,
    statementImports,
    transactions,
    merchantRules,
    monthlySnapshots,
  ] = await Promise.all([
    db.appSettings.toArray(),
    db.budgetCategories.toArray(),
    db.budgetPlans.toArray(),
    db.statementImports.toArray(),
    db.transactions.toArray(),
    db.merchantRules.toArray(),
    db.monthlySnapshots.toArray(),
  ]);

  return appBackupSchema.parse({
    data: {
      appSettings,
      budgetCategories,
      budgetPlans,
      merchantRules,
      monthlySnapshots,
      statementImports,
      transactions,
    },
    exportedAt: new Date().toISOString(),
    version: 1,
  });
}

export async function importAppData(
  backup: AppBackup,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedBackup = appBackupSchema.parse(backup);
  await replaceAllAppData(parsedBackup.data, db);
  return parsedBackup;
}
