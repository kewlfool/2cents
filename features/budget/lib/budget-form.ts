import { z } from "zod";

import { parseMajorUnitToMinorUnits, sumMinorUnits } from "@/lib/money";
import type { BudgetCategory, BudgetPlan } from "@/types";
import {
  categoryKindSchema,
  categoryModeSchema,
  currencyCodeSchema,
} from "@/types";

export const budgetFormCategorySchema = z
  .object({
    color: z.string().trim().max(32),
    iconKey: z.string().trim().max(32),
    id: z.string().trim().max(120),
    kind: categoryKindSchema,
    mode: categoryModeSchema,
    name: z.string().trim().min(1, "Category name is required.").max(80),
    plannedAmountInput: z.string().trim().min(1, "Planned amount is required."),
  })
  .superRefine((value, context) => {
    const parsedAmount = parseMajorUnitToMinorUnits(value.plannedAmountInput);

    if (parsedAmount === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid amount like 1250 or 1250.50.",
        path: ["plannedAmountInput"],
      });
      return;
    }

    if (parsedAmount < 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Planned amounts cannot be negative.",
        path: ["plannedAmountInput"],
      });
    }
  });

export const budgetFormSchema = z.object({
  categories: z
    .array(budgetFormCategorySchema)
    .min(1, "Add at least one category."),
  currency: currencyCodeSchema,
  monthStartDay: z.number().int().min(1).max(28),
  name: z.string().trim().min(1, "Budget name is required.").max(80),
  notes: z.string().trim().max(500),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export type BudgetBaselineDraftCategory = {
  color: string | null;
  iconKey: string | null;
  id: string | null;
  kind: BudgetCategory["kind"];
  mode: BudgetCategory["mode"];
  name: string;
  plannedAmount: number;
};

export type BudgetPlanMetadataDraft = {
  currency: BudgetPlan["currency"];
  monthStartDay: BudgetPlan["monthStartDay"];
  name: BudgetPlan["name"];
  notes: BudgetPlan["notes"];
};

export type BudgetBaselineDraft = {
  categories: BudgetBaselineDraftCategory[];
  plan: BudgetPlanMetadataDraft;
};

type BudgetBaselineSource = {
  categories: BudgetCategory[];
  plan: BudgetPlan | null;
  settings: {
    currency: string;
    monthStartDay: number;
  } | null;
};

export function createEmptyBudgetCategoryFormValue(
  kind: BudgetCategory["kind"],
): BudgetFormValues["categories"][number] {
  return {
    color: "",
    iconKey: "",
    id: "",
    kind,
    mode: kind === "income" ? "fixed" : "variable",
    name: "",
    plannedAmountInput: "",
  };
}

export function mapBudgetBaselineToFormValues(
  baseline: BudgetBaselineSource,
): BudgetFormValues {
  return {
    categories: baseline.categories
      .filter((category) => !category.archived)
      .map((category) => ({
        color: category.color ?? "",
        iconKey: category.iconKey ?? "",
        id: category.id,
        kind: category.kind,
        mode: category.mode,
        name: category.name,
        plannedAmountInput: String(category.plannedAmount / 100),
      })),
    currency: baseline.plan?.currency ?? baseline.settings?.currency ?? "USD",
    monthStartDay:
      baseline.plan?.monthStartDay ?? baseline.settings?.monthStartDay ?? 1,
    name: baseline.plan?.name ?? "My budget baseline",
    notes: baseline.plan?.notes ?? "",
  };
}

export function normalizeBudgetPlanMetadataDraft(values: BudgetFormValues) {
  const parsedValues = budgetFormSchema
    .pick({
      currency: true,
      monthStartDay: true,
      name: true,
      notes: true,
    })
    .parse(values);

  return {
    currency: parsedValues.currency,
    monthStartDay: parsedValues.monthStartDay,
    name: parsedValues.name.trim(),
    notes: parsedValues.notes.trim() || null,
  } satisfies BudgetPlanMetadataDraft;
}

export function normalizeBudgetFormValues(
  values: BudgetFormValues,
): BudgetBaselineDraft {
  const parsedValues = budgetFormSchema.parse(values);

  return {
    categories: parsedValues.categories.map((category) => {
      const parsedAmount = parseMajorUnitToMinorUnits(
        category.plannedAmountInput,
      );

      if (parsedAmount === null || parsedAmount < 0) {
        throw new Error(
          `Invalid planned amount for category "${category.name.trim()}".`,
        );
      }

      return {
        color: category.color.trim() || null,
        iconKey: category.iconKey.trim() || null,
        id: category.id.trim() || null,
        kind: category.kind,
        mode: category.mode,
        name: category.name.trim(),
        plannedAmount: parsedAmount,
      } satisfies BudgetBaselineDraftCategory;
    }),
    plan: normalizeBudgetPlanMetadataDraft(parsedValues),
  };
}

export function summarizeBudgetDraftCategories(
  categories: BudgetBaselineDraftCategory[],
) {
  const plannedIncome = sumMinorUnits(
    categories
      .filter((category) => category.kind === "income")
      .map((category) => category.plannedAmount),
  );
  const plannedExpenses = sumMinorUnits(
    categories
      .filter((category) => category.kind === "expense")
      .map((category) => category.plannedAmount),
  );

  return {
    expectedSavings: plannedIncome - plannedExpenses,
    plannedExpenses,
    plannedIncome,
  };
}

export function summarizeBudgetFormCategories(
  categories: BudgetFormValues["categories"],
) {
  const normalizedCategories = categories.flatMap((category) => {
    const parsedAmount = parseMajorUnitToMinorUnits(
      category.plannedAmountInput,
    );

    if (parsedAmount === null || parsedAmount < 0) {
      return [];
    }

    return [
      {
        color: category.color.trim() || null,
        iconKey: category.iconKey.trim() || null,
        id: category.id.trim() || null,
        kind: category.kind,
        mode: category.mode,
        name: category.name.trim(),
        plannedAmount: parsedAmount,
      } satisfies BudgetBaselineDraftCategory,
    ];
  });

  return summarizeBudgetDraftCategories(normalizedCategories);
}
