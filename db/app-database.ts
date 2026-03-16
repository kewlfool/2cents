import Dexie, { type Table } from "dexie";

import { databaseConfig } from "@/db/config";
import type {
  AppSettings,
  BudgetCategory,
  BudgetPlan,
  MerchantRule,
  MonthlySnapshot,
  StatementImport,
  Transaction,
} from "@/types";

export class TwoCentsDatabase extends Dexie {
  appSettings!: Table<AppSettings, AppSettings["id"]>;
  budgetCategories!: Table<BudgetCategory, BudgetCategory["id"]>;
  budgetPlans!: Table<BudgetPlan, BudgetPlan["id"]>;
  merchantRules!: Table<MerchantRule, MerchantRule["id"]>;
  monthlySnapshots!: Table<MonthlySnapshot, MonthlySnapshot["monthKey"]>;
  statementImports!: Table<StatementImport, StatementImport["id"]>;
  transactions!: Table<Transaction, Transaction["id"]>;

  constructor(name: string = databaseConfig.name) {
    super(name);

    this.version(databaseConfig.version).stores({
      appSettings: "id, activeBudgetPlanId, updatedAt",
      budgetCategories: "id, kind, mode, archived, sortOrder",
      budgetPlans: "id, isDefault, archived, updatedAt",
      merchantRules: "id, priority, categoryId, updatedAt",
      monthlySnapshots: "monthKey, generatedAt",
      statementImports: "id, monthKey, status, importedAt",
      transactions:
        "id, monthKey, date, merchantNormalized, categoryId, sourceImportId, ignored, transferLike, updatedAt",
    });
  }
}

let browserDatabase: TwoCentsDatabase | undefined;

export function createAppDatabase(name: string = databaseConfig.name) {
  return new TwoCentsDatabase(name);
}

export function getAppDatabase() {
  if (!browserDatabase) {
    browserDatabase = createAppDatabase();
  }

  return browserDatabase;
}
