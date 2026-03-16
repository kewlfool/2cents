"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMinorUnits } from "@/lib/money";

import { BudgetImportCard } from "@/features/budget/components/budget-import-card";
import { useBudgetBaseline } from "@/features/budget/hooks/use-budget-baseline";
import { saveBudgetBaselineDraft } from "@/features/budget/lib/budget-baseline";
import {
  budgetFormSchema,
  createEmptyBudgetCategoryFormValue,
  mapBudgetBaselineToFormValues,
  normalizeBudgetFormValues,
  normalizeBudgetPlanMetadataDraft,
  summarizeBudgetFormCategories,
  type BudgetBaselineDraftCategory,
  type BudgetFormValues,
} from "@/features/budget/lib/budget-form";

type ScreenMessage = {
  body: string;
  tone: "error" | "success";
};

const monthStartOptions = Array.from({ length: 28 }, (_, index) => index + 1);

const emptyFormValues: BudgetFormValues = {
  categories: [
    createEmptyBudgetCategoryFormValue("income"),
    createEmptyBudgetCategoryFormValue("expense"),
  ],
  currency: "USD",
  monthStartDay: 1,
  name: "My budget baseline",
  notes: "",
};

type CategorySectionProps = {
  errors: ReturnType<typeof useForm<BudgetFormValues>>["formState"]["errors"];
  kind: "income" | "expense";
  onAddCategory: (kind: "income" | "expense") => void;
  onRemoveCategory: (index: number) => void;
  register: ReturnType<typeof useForm<BudgetFormValues>>["register"];
  rows: Array<{
    fieldKey: string;
    index: number;
  }>;
};

function CategorySection({
  errors,
  kind,
  onAddCategory,
  onRemoveCategory,
  register,
  rows,
}: CategorySectionProps) {
  const title = kind === "income" ? "Income categories" : "Expense categories";
  const description =
    kind === "income"
      ? "Define the earnings categories that make up the monthly baseline."
      : "Define both fixed and variable spending categories for the baseline.";

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-ink text-base font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-muted mt-1 text-sm leading-6">{description}</p>
        </div>
        <Button
          onClick={() => onAddCategory(kind)}
          size="sm"
          variant="secondary"
        >
          Add {kind}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
          No {kind} categories yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              className="border-line/70 bg-panel-strong/30 rounded-[24px] border p-4"
              key={row.fieldKey}
            >
              <input
                type="hidden"
                {...register(`categories.${row.index}.id`)}
              />
              <input
                type="hidden"
                {...register(`categories.${row.index}.kind`)}
              />
              <input
                type="hidden"
                {...register(`categories.${row.index}.color`)}
              />
              <input
                type="hidden"
                {...register(`categories.${row.index}.iconKey`)}
              />

              <div className="grid gap-3 md:grid-cols-[1.6fr_0.9fr_1fr_auto]">
                <div className="space-y-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor={`budget-category-name-${row.index}`}
                  >
                    Category name
                  </label>
                  <Input
                    id={`budget-category-name-${row.index}`}
                    placeholder={
                      kind === "income"
                        ? "Salary, freelance..."
                        : "Rent, groceries..."
                    }
                    {...register(`categories.${row.index}.name`)}
                  />
                  {errors.categories?.[row.index]?.name ? (
                    <p className="text-warning text-sm">
                      {errors.categories[row.index]?.name?.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor={`budget-category-mode-${row.index}`}
                  >
                    Mode
                  </label>
                  <Select
                    id={`budget-category-mode-${row.index}`}
                    {...register(`categories.${row.index}.mode`)}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="variable">Variable</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor={`budget-category-amount-${row.index}`}
                  >
                    Planned amount
                  </label>
                  <Input
                    id={`budget-category-amount-${row.index}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    {...register(`categories.${row.index}.plannedAmountInput`)}
                  />
                  {errors.categories?.[row.index]?.plannedAmountInput ? (
                    <p className="text-warning text-sm">
                      {
                        errors.categories[row.index]?.plannedAmountInput
                          ?.message
                      }
                    </p>
                  ) : null}
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => onRemoveCategory(row.index)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function BudgetSetupScreen() {
  const bootstrap = useAppBootstrap();
  const baseline = useBudgetBaseline();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<ScreenMessage | null>(null);

  const form = useForm<BudgetFormValues>({
    defaultValues: emptyFormValues,
    resolver: zodResolver(budgetFormSchema),
  });
  const fieldArray = useFieldArray({
    control: form.control,
    keyName: "fieldKey",
    name: "categories",
  });

  const watchedCategories = useWatch({
    control: form.control,
    name: "categories",
  });
  const currentSummary = summarizeBudgetFormCategories(watchedCategories ?? []);
  const categoriesByKind = fieldArray.fields.reduce<{
    expense: Array<{ fieldKey: string; index: number }>;
    income: Array<{ fieldKey: string; index: number }>;
  }>(
    (accumulator, field, index) => {
      const kind = watchedCategories?.[index]?.kind ?? field.kind;
      accumulator[kind].push({
        fieldKey: field.fieldKey,
        index,
      });
      return accumulator;
    },
    {
      expense: [],
      income: [],
    },
  );

  useEffect(() => {
    if (!baseline) {
      return;
    }

    form.reset(mapBudgetBaselineToFormValues(baseline));
  }, [baseline, form]);

  async function saveCategories(categories: BudgetBaselineDraftCategory[]) {
    const currentValues = form.getValues();
    const plan = normalizeBudgetPlanMetadataDraft(currentValues);

    await saveBudgetBaselineDraft({
      categories,
      plan,
    });
  }

  const handleManualSubmit = form.handleSubmit(async (values) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const draft = normalizeBudgetFormValues(values);
      await saveBudgetBaselineDraft(draft);
      setMessage({
        body: "Budget baseline saved. Removed categories were archived so historical transactions stay linked.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the budget baseline.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  });

  async function handleApplyImportedCategories(
    categories: BudgetBaselineDraftCategory[],
  ) {
    setMessage(null);
    await saveCategories(categories);
    setMessage({
      body: "Imported categories applied to the active budget baseline. Matching categories were updated and the rest were archived safely.",
      tone: "success",
    });
  }

  if (bootstrap.status === "booting" || !baseline) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Phase 3 loading</Badge>}
          description="Preparing the local budget baseline so manual editing and import staging can start from real data."
          eyebrow="Budget setup"
          title="Budget setup"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            Loading the local budget baseline from IndexedDB.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">Phase 3 live</Badge>}
        description="Define the active budget baseline manually or stage a CSV/XLSX import. Expected savings stays derived from planned income minus planned expenses so the baseline stays internally consistent."
        eyebrow="Budget setup"
        title="Budget setup"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Planned income</CardDescription>
            <CardTitle className="text-2xl">
              {formatMinorUnits(
                currentSummary.plannedIncome,
                form.getValues("currency"),
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Planned expenses</CardDescription>
            <CardTitle className="text-2xl">
              {formatMinorUnits(
                currentSummary.plannedExpenses,
                form.getValues("currency"),
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Expected savings</CardDescription>
            <CardTitle className="text-2xl">
              {formatMinorUnits(
                currentSummary.expectedSavings,
                form.getValues("currency"),
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Active categories</CardDescription>
            <CardTitle className="text-2xl">
              {categoriesByKind.income.length + categoriesByKind.expense.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {message ? (
        <div
          className={
            message.tone === "error"
              ? "border-warning/30 text-warning rounded-[28px] border bg-orange-50 px-5 py-4 text-sm leading-6"
              : "border-success/20 text-success rounded-[28px] border bg-emerald-50 px-5 py-4 text-sm leading-6"
          }
        >
          {message.body}
        </div>
      ) : null}

      {bootstrap.errorMessage ? (
        <div className="border-warning/30 text-warning rounded-[28px] border bg-orange-50 px-5 py-4 text-sm leading-6">
          {bootstrap.errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Manual baseline editor</CardTitle>
            <CardDescription>
              Changes save into the active local baseline and immediately update
              the derived monthly snapshots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-6"
              onSubmit={(event) => void handleManualSubmit(event)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor="budget-name"
                  >
                    Budget name
                  </label>
                  <Input id="budget-name" {...form.register("name")} />
                  {form.formState.errors.name ? (
                    <p className="text-warning text-sm">
                      {form.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor="budget-currency"
                  >
                    Currency
                  </label>
                  <Input
                    autoCapitalize="characters"
                    id="budget-currency"
                    maxLength={3}
                    {...form.register("currency")}
                  />
                  {form.formState.errors.currency ? (
                    <p className="text-warning text-sm">
                      {form.formState.errors.currency.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor="budget-month-start-day"
                  >
                    Month start day
                  </label>
                  <Select
                    id="budget-month-start-day"
                    {...form.register("monthStartDay", {
                      setValueAs: (value) => Number(value),
                    })}
                  >
                    {monthStartOptions.map((day) => (
                      <option key={day} value={day}>
                        Day {day}
                      </option>
                    ))}
                  </Select>
                  <p className="text-muted text-sm leading-6">
                    Keep this aligned with how you review monthly statements.
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor="budget-notes"
                  >
                    Notes
                  </label>
                  <Textarea
                    id="budget-notes"
                    placeholder="Optional planning notes for this baseline."
                    {...form.register("notes")}
                  />
                  {form.formState.errors.notes ? (
                    <p className="text-warning text-sm">
                      {form.formState.errors.notes.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                Expected savings is derived automatically from planned income
                minus planned expenses. This avoids the baseline drifting into
                contradictory totals.
              </div>

              <CategorySection
                errors={form.formState.errors}
                kind="income"
                onAddCategory={(kind) =>
                  fieldArray.append(createEmptyBudgetCategoryFormValue(kind))
                }
                onRemoveCategory={(index) => fieldArray.remove(index)}
                register={form.register}
                rows={categoriesByKind.income}
              />

              <CategorySection
                errors={form.formState.errors}
                kind="expense"
                onAddCategory={(kind) =>
                  fieldArray.append(createEmptyBudgetCategoryFormValue(kind))
                }
                onRemoveCategory={(index) => fieldArray.remove(index)}
                register={form.register}
                rows={categoriesByKind.expense}
              />

              {form.formState.errors.categories?.message ? (
                <p className="text-warning text-sm">
                  {form.formState.errors.categories.message}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button disabled={isSaving} type="submit" variant="primary">
                  {isSaving ? "Saving baseline..." : "Save baseline"}
                </Button>
                <Button
                  disabled={isSaving}
                  onClick={() =>
                    form.reset(mapBudgetBaselineToFormValues(baseline))
                  }
                  type="button"
                  variant="secondary"
                >
                  Reset to saved baseline
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <BudgetImportCard
          disabled={isSaving}
          onApplyImport={handleApplyImportedCategories}
        />
      </section>
    </div>
  );
}
