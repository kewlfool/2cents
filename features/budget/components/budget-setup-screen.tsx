"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";

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
  currency: string;
  errors: ReturnType<typeof useForm<BudgetFormValues>>["formState"]["errors"];
  kind: "income" | "expense";
  onAddCategory: (kind: "income" | "expense") => void;
  onRemoveCategory: (index: number) => void;
  register: ReturnType<typeof useForm<BudgetFormValues>>["register"];
  rows: Array<{
    fieldKey: string;
    index: number;
  }>;
  subtotal: number;
};

function SummaryMetric(props: {
  detail: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-line/70 bg-panel/96 rounded-[var(--radius-panel)] border px-3 py-2">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-ink text-base font-semibold tracking-tight">
          {props.value}
        </p>
        <p className="text-muted text-right text-[0.75rem] leading-4">
          {props.detail}
        </p>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function WorkspaceSection(props: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
  variant?: "default" | "elevated" | "muted";
}) {
  const variantClass =
    props.variant === "elevated"
      ? "shadow-[var(--shadow-panel)]"
      : props.variant === "muted"
        ? "bg-panel-strong/18"
        : "bg-panel/96";

  return (
    <section
      className={cn(
        "border-line/70 rounded-[var(--radius-panel)] border",
        variantClass,
      )}
    >
      <div className="border-line/60 flex items-start justify-between gap-3 border-b px-[var(--space-card)] py-[var(--space-card-compact)]">
        <div className="min-w-0">
          <h2 className="text-ink text-sm font-semibold tracking-tight">
            {props.title}
          </h2>
          {props.description ? (
            <p className="text-muted mt-1 text-[0.8125rem] leading-5">
              {props.description}
            </p>
          ) : null}
        </div>
        {props.actions ? <div className="shrink-0">{props.actions}</div> : null}
      </div>
      <div className="p-[var(--space-card)]">{props.children}</div>
    </section>
  );
}

function SnapshotRow(props: { label: string; secondary: string; value: ReactNode }) {
  return (
    <ListRow className="items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold tracking-tight">{props.label}</p>
        <p className="text-muted text-[0.75rem] leading-4">{props.secondary}</p>
      </div>
      <div className="text-ink shrink-0 text-right text-sm font-semibold">
        {props.value}
      </div>
    </ListRow>
  );
}

function InfoBlock(props: { body: string }) {
  return (
    <div className="border-line/70 bg-panel text-muted rounded-[var(--radius-control)] border px-3.5 py-3 text-sm leading-5">
      {props.body}
    </div>
  );
}

function CategorySection({
  currency,
  errors,
  kind,
  onAddCategory,
  onRemoveCategory,
  register,
  rows,
  subtotal,
}: CategorySectionProps) {
  const title = kind === "income" ? "Income categories" : "Expense categories";

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <h3 className="text-ink text-base font-semibold tracking-tight">
            {title}
          </h3>
          <Badge variant="outline">{rows.length} rows</Badge>
          <Badge variant="outline">{formatMinorUnits(subtotal, currency)}</Badge>
        </div>
        <Button
          onClick={() => onAddCategory(kind)}
          size="sm"
          variant="secondary"
        >
          Add row
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState body={`No ${kind} categories yet.`} className="bg-panel" />
      ) : (
        <div className="space-y-2">
          <div className="text-muted hidden grid-cols-[minmax(0,1.7fr)_minmax(8rem,0.8fr)_minmax(9rem,0.9fr)_auto] px-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] md:grid">
            <span>Category</span>
            <span>Mode</span>
            <span>Planned amount</span>
            <span className="text-right">Action</span>
          </div>
          <List>
            {rows.map((row) => (
              <ListRow className="items-start gap-2.5 px-3 py-2.5" key={row.fieldKey}>
                <input type="hidden" {...register(`categories.${row.index}.id`)} />
                <input type="hidden" {...register(`categories.${row.index}.kind`)} />
                <input type="hidden" {...register(`categories.${row.index}.color`)} />
                <input type="hidden" {...register(`categories.${row.index}.iconKey`)} />

                <div className="grid w-full gap-2.5 md:grid-cols-[minmax(0,1.7fr)_minmax(8rem,0.8fr)_minmax(9rem,0.9fr)_auto] md:items-start">
                  <div className="space-y-1.5">
                    <p className="text-muted text-[0.68rem] font-semibold uppercase tracking-[0.14em] md:hidden">
                      Category
                    </p>
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
                          ? "Salary"
                          : "Rent"
                      }
                      {...register(`categories.${row.index}.name`)}
                    />
                    {errors.categories?.[row.index]?.name ? (
                      <p className="text-warning text-[0.75rem] leading-4">
                        {errors.categories[row.index]?.name?.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-muted text-[0.68rem] font-semibold uppercase tracking-[0.14em] md:hidden">
                      Mode
                    </p>
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

                  <div className="space-y-1.5">
                    <p className="text-muted text-[0.68rem] font-semibold uppercase tracking-[0.14em] md:hidden">
                      Planned amount
                    </p>
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
                      <p className="text-warning text-[0.75rem] leading-4">
                        {
                          errors.categories[row.index]?.plannedAmountInput
                            ?.message
                        }
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-end md:justify-end">
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
  const watchedName = useWatch({
    control: form.control,
    name: "name",
  });
  const watchedCurrency = useWatch({
    control: form.control,
    name: "currency",
  });
  const watchedMonthStartDay = useWatch({
    control: form.control,
    name: "monthStartDay",
  });
  const watchedNotes = useWatch({
    control: form.control,
    name: "notes",
  });
  const currentSummary = summarizeBudgetFormCategories(watchedCategories ?? []);
  const incomeSummary = summarizeBudgetFormCategories(
    (watchedCategories ?? []).filter((category) => category.kind === "income"),
  );
  const expenseSummary = summarizeBudgetFormCategories(
    (watchedCategories ?? []).filter((category) => category.kind === "expense"),
  );
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
    <div className="space-y-5">
      <PageHeader
        badge={<Badge variant="accent">Manual baseline</Badge>}
        eyebrow="Budget setup"
        title="Budget setup"
      />

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          detail="Monthly"
          label="Planned income"
          value={formatMinorUnits(
            currentSummary.plannedIncome,
            watchedCurrency,
          )}
        />
        <SummaryMetric
          detail="Monthly"
          label="Planned expenses"
          value={formatMinorUnits(
            currentSummary.plannedExpenses,
            watchedCurrency,
          )}
        />
        <SummaryMetric
          detail="Derived"
          label="Expected savings"
          value={formatMinorUnits(
            currentSummary.expectedSavings,
            watchedCurrency,
          )}
        />
        <SummaryMetric
          detail="Editable"
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

      <form
        className="grid gap-3.5 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.9fr)]"
        onSubmit={(event) => void handleManualSubmit(event)}
      >
        <div className="grid gap-3.5">
          <WorkspaceSection
            actions={<Badge variant="outline">Baseline controls</Badge>}
            title="Plan settings"
            variant="muted"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.65fr)_minmax(0,0.85fr)]">
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
          </WorkspaceSection>

          <WorkspaceSection
            actions={
              <div className="flex flex-wrap gap-2">
                <Button disabled={isSaving} type="submit" variant="primary">
                  {isSaving ? "Saving baseline..." : "Save baseline"}
                </Button>
                <Button
                  disabled={isSaving}
                  onClick={() => form.reset(mapBudgetBaselineToFormValues(baseline))}
                  type="button"
                  variant="secondary"
                >
                  Reset
                </Button>
              </div>
            }
            description="Edit the active monthly baseline."
            title="Category plan"
            variant="elevated"
          >
            <div className="space-y-5">
              <InfoBlock body="Expected savings is derived from planned income minus planned expenses." />

              <CategorySection
                currency={watchedCurrency}
                errors={form.formState.errors}
                kind="income"
                onAddCategory={(kind) =>
                  fieldArray.append(createEmptyBudgetCategoryFormValue(kind))
                }
                onRemoveCategory={(index) => fieldArray.remove(index)}
                register={form.register}
                rows={categoriesByKind.income}
                subtotal={incomeSummary.plannedIncome}
              />

              <CategorySection
                currency={watchedCurrency}
                errors={form.formState.errors}
                kind="expense"
                onAddCategory={(kind) =>
                  fieldArray.append(createEmptyBudgetCategoryFormValue(kind))
                }
                onRemoveCategory={(index) => fieldArray.remove(index)}
                register={form.register}
                rows={categoriesByKind.expense}
                subtotal={expenseSummary.plannedExpenses}
              />

              {form.formState.errors.categories?.message ? (
                <p className="text-warning text-sm">
                  {form.formState.errors.categories.message}
                </p>
              ) : null}
            </div>
          </WorkspaceSection>
        </div>

        <div className="grid gap-3.5 xl:sticky xl:top-[4.5rem] xl:self-start">
          <WorkspaceSection title="Workspace snapshot" variant="muted">
            <List>
              <SnapshotRow
                label="Budget name"
                secondary="Current form"
                value={watchedName.trim() || "Untitled"}
              />
              <SnapshotRow
                label="Currency"
                secondary="Display"
                value={watchedCurrency}
              />
              <SnapshotRow
                label="Month start"
                secondary="Review cycle"
                value={`Day ${watchedMonthStartDay}`}
              />
              <SnapshotRow
                label="Active categories"
                secondary="Editable rows"
                value={categoriesByKind.income.length + categoriesByKind.expense.length}
              />
              <SnapshotRow
                label="Unsaved changes"
                secondary="Form state"
                value={form.formState.isDirty ? "Pending" : "Saved"}
              />
            </List>
          </WorkspaceSection>

          <WorkspaceSection title="Monthly shape">
            <List>
              <SnapshotRow
                label="Income"
                secondary="Planned"
                value={formatMinorUnits(currentSummary.plannedIncome, watchedCurrency)}
              />
              <SnapshotRow
                label="Expenses"
                secondary="Planned"
                value={formatMinorUnits(currentSummary.plannedExpenses, watchedCurrency)}
              />
              <SnapshotRow
                label="Expected savings"
                secondary="Derived"
                value={formatMinorUnits(currentSummary.expectedSavings, watchedCurrency)}
              />
            </List>
          </WorkspaceSection>

          <WorkspaceSection title="Baseline notes">
            <div className="space-y-3">
              <InfoBlock
                body={
                  watchedNotes.trim().length > 0
                    ? watchedNotes.trim()
                    : "No planning notes recorded for this baseline."
                }
              />
              <InfoBlock
                body={
                  baseline.plan
                    ? `Saved baseline updated ${formatDateTime(baseline.plan.updatedAt)}. Current review cycle starts on day ${watchedMonthStartDay}.`
                    : `No saved baseline metadata yet. Current review cycle starts on day ${watchedMonthStartDay}.`
                }
              />
            </div>
          </WorkspaceSection>
        </div>
      </form>
    </div>
  );
}
