import {
  budgetCategorySchema,
  budgetPlanSchema,
  type BudgetCategory,
  type BudgetPlan,
} from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";

export async function listBudgetCategories(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const categories = await db.budgetCategories.orderBy("sortOrder").toArray();
  return categories.map((category) => budgetCategorySchema.parse(category));
}

export async function countBudgetCategories(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  return db.budgetCategories.count();
}

export async function getDefaultBudgetPlan(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const plans = await db.budgetPlans.toArray();
  const defaultPlan =
    plans.find((plan) => plan.isDefault && !plan.archived) ?? plans[0] ?? null;

  return defaultPlan ? budgetPlanSchema.parse(defaultPlan) : null;
}

export async function putBudgetPlan(
  plan: BudgetPlan,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedPlan = budgetPlanSchema.parse(plan);
  await db.budgetPlans.put(parsedPlan);
  return parsedPlan;
}

export async function bulkPutBudgetCategories(
  categories: BudgetCategory[],
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedCategories = categories.map((category) =>
    budgetCategorySchema.parse(category),
  );
  await db.budgetCategories.bulkPut(parsedCategories);
  return parsedCategories;
}
