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
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMinorUnits } from "@/lib/money";

import { useBudgetBaseline } from "@/features/budget/hooks/use-budget-baseline";
import { saveBudgetBaselineDraft } from "@/features/budget/lib/budget-baseline";
import {
  budgetFormSchema,
  createEmptyBudgetCategoryFormValue,
  mapBudgetBaselineToFormValues,
  normalizeBudgetFormValues,
  summarizeBudgetFormCategories,
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

function SummaryMetric(props: {
  description: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-line/70 bg-panel/96 space-y-1 rounded-xl border px-4 py-3">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <p className="text-ink text-xl font-semibold tracking-tight">
        {props.value}
      </p>
      <p className="text-muted text-sm leading-5">{props.description}</p>
    </div>
  );
}

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
        <div className="border-line/70 bg-panel text-muted rounded-xl border px-4 py-4 text-sm leading-6">
          No {kind} categories yet.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-muted hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] px-4 text-xs font-semibold uppercase tracking-[0.16em] md:grid">
            <span>Category</span>
            <span>Mode</span>
            <span>Planned amount</span>
            <span className="text-right">Action</span>
          </div>
          <List>
            {rows.map((row) => (
              <ListRow className="items-start gap-3" key={row.fieldKey}>
                <input type="hidden" {...register(`categories.${row.index}.id`)} />
                <input type="hidden" {...register(`categories.${row.index}.kind`)} />
                <input type="hidden" {...register(`categories.${row.index}.color`)} />
                <input type="hidden" {...register(`categories.${row.index}.iconKey`)} />

                <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <label
                      className="text-ink block text-sm font-semibold md:sr-only"
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
                      className="text-ink block text-sm font-semibold md:sr-only"
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
                      className="text-ink block text-sm font-semibold md:sr-only"
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

                  <div className="flex items-center md:justify-end">
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
              </ListRow>
            ))}
          </List>
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

  if (bootstrap.status === "booting" || !baseline) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Budget loading</Badge>}
          description="Preparing the local budget baseline so manual editing can start from real data."
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
        badge={<Badge variant="accent">Manual baseline</Badge>}
        description="Build the active budget baseline directly in the app. Expected savings stays derived from planned income minus planned expenses so the baseline stays internally consistent."
        eyebrow="Budget setup"
        title="Budget setup"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          description="Current planned monthly income."
          label="Planned income"
          value={formatMinorUnits(
            currentSummary.plannedIncome,
            form.getValues("currency"),
          )}
        />
        <SummaryMetric
          description="Current planned monthly expenses."
          label="Planned expenses"
          value={formatMinorUnits(
            currentSummary.plannedExpenses,
            form.getValues("currency"),
          )}
        />
        <SummaryMetric
          description="Derived income minus expenses."
          label="Expected savings"
          value={formatMinorUnits(
            currentSummary.expectedSavings,
            form.getValues("currency"),
          )}
        />
        <SummaryMetric
          description="Active categories in the baseline."
          label="Active categories"
          value={categoriesByKind.income.length + categoriesByKind.expense.length}
        />
      </section>

      {message ? (
        <Notice tone={message.tone}>
          {message.body}
        </Notice>
      ) : null}

      {bootstrap.errorMessage ? (
        <Notice tone="warning">
          {bootstrap.errorMessage}
        </Notice>
      ) : null}

      <Card variant="elevated">
        <CardHeader className="border-b border-line/60">
          <CardTitle>Baseline editor</CardTitle>
          <CardDescription>
            Changes save into the active local baseline and immediately update
            the derived monthly snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            className="space-y-6"
            onSubmit={(event) => void handleManualSubmit(event)}
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.65fr)_minmax(0,0.85fr)]">
              <div className="space-y-2">
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
              </div>

              <div className="space-y-2 md:col-span-3">
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

            <div className="border-line/70 bg-panel text-muted rounded-xl border px-4 py-4 text-sm leading-6">
              Expected savings is derived automatically from planned income
              minus planned expenses. This keeps the baseline internally
              consistent and removes the need to maintain a separate savings
              field by hand.
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

            <div className="border-line/60 flex flex-wrap gap-3 border-t pt-4">
              <Button disabled={isSaving} type="submit" variant="primary">
                {isSaving ? "Saving baseline..." : "Save baseline"}
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => form.reset(mapBudgetBaselineToFormValues(baseline))}
                type="button"
                variant="secondary"
              >
                Reset to saved baseline
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
