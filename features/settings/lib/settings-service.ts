import {
  appSettingsSchema,
  budgetPlanSchema,
  statementImportSchema,
  transactionSchema,
} from "@/types";

import {
  getAppDatabase,
  type TwoCentsDatabase,
} from "@/db";
import { getAppSettings, getDefaultBudgetPlan } from "@/db/repositories";
import { createIsoTimestamp, toMonthKey } from "@/lib/date";
import { buildMonthlySnapshot } from "@/lib/monthly-snapshots";

import {
  settingsPreferencesFormSchema,
  type SettingsPreferencesFormValues,
} from "@/features/settings/lib/settings-form";

function pickPrimaryMonthKey(monthKeys: string[]) {
  if (monthKeys.length === 0) {
    return null;
  }

  const counts = monthKeys.reduce<Map<string, number>>((accumulator, monthKey) => {
    accumulator.set(monthKey, (accumulator.get(monthKey) ?? 0) + 1);
    return accumulator;
  }, new Map());

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return right[0].localeCompare(left[0]);
  })[0]?.[0] ?? null;
}

export async function saveAppPreferences(
  values: SettingsPreferencesFormValues,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedValues = settingsPreferencesFormSchema.parse(values);
  const now = createIsoTimestamp();

  return db.transaction(
    "rw",
    [
      db.appSettings,
      db.budgetPlans,
      db.transactions,
      db.statementImports,
      db.monthlySnapshots,
      db.budgetCategories,
    ],
    async () => {
      const [
        existingSettings,
        existingPlan,
        categories,
        transactions,
        statementImports,
        existingSnapshots,
      ] = await Promise.all([
        getAppSettings(db),
        getDefaultBudgetPlan(db),
        db.budgetCategories.toArray(),
        db.transactions.toArray(),
        db.statementImports.toArray(),
        db.monthlySnapshots.toArray(),
      ]);

      const monthStartChanged =
        (existingSettings?.monthStartDay ?? existingPlan?.monthStartDay ?? 1) !==
        parsedValues.monthStartDay;
      const nextTransactions = transactions.map((transaction) => {
        if (!monthStartChanged) {
          return transactionSchema.parse(transaction);
        }

        const nextMonthKey = toMonthKey(transaction.date, parsedValues.monthStartDay);

        return transactionSchema.parse({
          ...transaction,
          monthKey: nextMonthKey,
          updatedAt: nextMonthKey === transaction.monthKey ? transaction.updatedAt : now,
        });
      });

      const nextStatementImports = statementImports.map((statementImport) => {
        const linkedTransactions = nextTransactions.filter(
          (transaction) => transaction.sourceImportId === statementImport.id,
        );
        const nextMonthKey =
          statementImport.status === "committed"
            ? pickPrimaryMonthKey(
                linkedTransactions.map((transaction) => transaction.monthKey),
              ) ?? statementImport.monthKey
            : statementImport.monthKey;

        return statementImportSchema.parse({
          ...statementImport,
          monthKey: nextMonthKey,
        });
      });

      const nextPlan = existingPlan
        ? budgetPlanSchema.parse({
            ...existingPlan,
            currency: parsedValues.currency,
            monthStartDay: parsedValues.monthStartDay,
            updatedAt: now,
          })
        : null;

      const nextSettings = appSettingsSchema.parse({
        activeBudgetPlanId: nextPlan?.id ?? existingSettings?.activeBudgetPlanId ?? null,
        createdAt: existingSettings?.createdAt ?? now,
        currency: parsedValues.currency,
        demoDataSeededAt: existingSettings?.demoDataSeededAt ?? null,
        hasCompletedOnboarding:
          existingSettings?.hasCompletedOnboarding ?? false,
        id: "app-settings",
        locale: existingSettings?.locale ?? "en-US",
        monthStartDay: parsedValues.monthStartDay,
        updatedAt: now,
      });

      const snapshotMonthKeys = Array.from(
        new Set([
          ...existingSnapshots.map((snapshot) => snapshot.monthKey),
          ...nextTransactions.map((transaction) => transaction.monthKey),
        ]),
      ).sort();
      const nextSnapshots = snapshotMonthKeys.map((monthKey) =>
        buildMonthlySnapshot({
          categories,
          generatedAt: now,
          monthKey,
          transactions: nextTransactions,
        }),
      );

      await db.appSettings.put(nextSettings);

      if (nextPlan) {
        await db.budgetPlans.put(nextPlan);
      }

      if (nextTransactions.length > 0) {
        await db.transactions.bulkPut(nextTransactions);
      }

      if (nextStatementImports.length > 0) {
        await db.statementImports.bulkPut(nextStatementImports);
      }

      await db.monthlySnapshots.clear();

      if (nextSnapshots.length > 0) {
        await db.monthlySnapshots.bulkPut(nextSnapshots);
      }

      return {
        settings: nextSettings,
      };
    },
  );
}
