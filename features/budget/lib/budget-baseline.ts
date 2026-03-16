import {
  appSettingsSchema,
  budgetCategorySchema,
  budgetPlanSchema,
} from "@/types";

import { getAppDatabase, getAppSettings, getDefaultBudgetPlan } from "@/db";
import { createIsoTimestamp } from "@/lib/date";
import { buildMonthlySnapshot } from "@/lib/monthly-snapshots";
import { sumMinorUnits } from "@/lib/money";

import type {
  BudgetBaselineDraft,
  BudgetBaselineDraftCategory,
} from "@/features/budget/lib/budget-form";

function normalizeCategoryKey(
  name: string,
  kind: BudgetBaselineDraftCategory["kind"],
) {
  return `${kind}:${name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function createBudgetCategoryId(name: string) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `category-${normalizedName || "item"}-${crypto.randomUUID().slice(0, 8)}`;
}

function getDefaultCategoryColor(category: BudgetBaselineDraftCategory) {
  if (category.kind === "income") {
    return category.mode === "fixed" ? "#356f64" : "#5b907b";
  }

  return category.mode === "fixed" ? "#b36f4a" : "#597a4b";
}

export async function saveBudgetBaselineDraft(
  draft: BudgetBaselineDraft,
  db = getAppDatabase(),
) {
  const now = createIsoTimestamp();

  await db.transaction(
    "rw",
    [
      db.appSettings,
      db.budgetPlans,
      db.budgetCategories,
      db.transactions,
      db.monthlySnapshots,
    ],
    async () => {
      const [
        existingPlan,
        existingSettings,
        existingCategories,
        transactions,
        existingSnapshots,
      ] = await Promise.all([
        getDefaultBudgetPlan(db),
        getAppSettings(db),
        db.budgetCategories.toArray(),
        db.transactions.toArray(),
        db.monthlySnapshots.toArray(),
      ]);

      const existingCategoriesById = new Map(
        existingCategories.map((category) => [category.id, category]),
      );
      const existingCategoriesByKey = new Map(
        existingCategories.map((category) => [
          normalizeCategoryKey(category.name, category.kind),
          category,
        ]),
      );

      const activeCategories = draft.categories.map((category, index) => {
        const matchedCategory =
          (category.id ? existingCategoriesById.get(category.id) : undefined) ??
          existingCategoriesByKey.get(
            normalizeCategoryKey(category.name, category.kind),
          );

        return budgetCategorySchema.parse({
          archived: false,
          color:
            category.color ??
            matchedCategory?.color ??
            getDefaultCategoryColor(category),
          iconKey: category.iconKey ?? matchedCategory?.iconKey ?? null,
          id: matchedCategory?.id ?? createBudgetCategoryId(category.name),
          kind: category.kind,
          mode: category.mode,
          name: category.name,
          plannedAmount: category.plannedAmount,
          sortOrder: index * 10 + 10,
        });
      });

      const activeIds = new Set(
        activeCategories.map((category) => category.id),
      );
      const archivedCategories = existingCategories
        .filter((category) => !activeIds.has(category.id))
        .map((category) =>
          budgetCategorySchema.parse({
            ...category,
            archived: true,
          }),
        );

      const plannedIncome = sumMinorUnits(
        activeCategories
          .filter((category) => category.kind === "income")
          .map((category) => category.plannedAmount),
      );
      const plannedExpenses = sumMinorUnits(
        activeCategories
          .filter((category) => category.kind === "expense")
          .map((category) => category.plannedAmount),
      );

      const plan = budgetPlanSchema.parse({
        archived: false,
        categoryIds: activeCategories.map((category) => category.id),
        createdAt: existingPlan?.createdAt ?? now,
        currency: draft.plan.currency,
        expectedSavings: plannedIncome - plannedExpenses,
        id: existingPlan?.id ?? `budget-plan-${crypto.randomUUID()}`,
        isDefault: true,
        monthStartDay: draft.plan.monthStartDay,
        name: draft.plan.name,
        notes: draft.plan.notes,
        updatedAt: now,
      });

      const settings = appSettingsSchema.parse({
        activeBudgetPlanId: plan.id,
        createdAt: existingSettings?.createdAt ?? now,
        currency: plan.currency,
        demoDataSeededAt: existingSettings?.demoDataSeededAt ?? null,
        hasCompletedOnboarding:
          existingSettings?.hasCompletedOnboarding ?? false,
        id: "app-settings",
        locale: existingSettings?.locale ?? "en-US",
        monthStartDay: plan.monthStartDay,
        updatedAt: now,
      });

      const categoriesForStorage = [...archivedCategories, ...activeCategories];
      const snapshotMonthKeys = Array.from(
        new Set([
          ...transactions.map((transaction) => transaction.monthKey),
          ...existingSnapshots.map((snapshot) => snapshot.monthKey),
        ]),
      ).sort();
      const nextSnapshots = snapshotMonthKeys.map((monthKey) =>
        buildMonthlySnapshot({
          categories: categoriesForStorage,
          generatedAt: now,
          monthKey,
          transactions,
        }),
      );

      await db.budgetCategories.bulkPut(categoriesForStorage);
      await db.budgetPlans.put(plan);
      await db.appSettings.put(settings);
      await db.monthlySnapshots.clear();

      if (nextSnapshots.length > 0) {
        await db.monthlySnapshots.bulkPut(nextSnapshots);
      }
    },
  );
}
