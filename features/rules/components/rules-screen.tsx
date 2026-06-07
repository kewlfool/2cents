"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
import { normalizeMerchantName } from "@/features/import/lib/merchant-normalization";
import { useRulesWorkspace } from "@/features/rules/hooks/use-rules-workspace";
import { previewMerchantRuleApplications } from "@/features/rules/lib/rule-application";
import {
  createEmptyMerchantRuleFormValues,
  merchantRuleFormSchema,
  type MerchantRuleFormValues,
} from "@/features/rules/lib/rule-form";
import { findMatchingMerchantRule } from "@/features/rules/lib/rule-matching";
import {
  applyMerchantRulePreview,
  deleteMerchantRule,
  saveMerchantRule,
} from "@/features/rules/lib/rules-service";
import { formatMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";

type ScreenMessage = {
  body: string;
  tone: "error" | "success";
};

const matchTypeLabels = {
  contains: "Contains",
  exact: "Exact",
  regex: "Regex",
  startsWith: "Starts with",
} as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

export function RulesScreen() {
  const bootstrap = useAppBootstrap();
  const workspace = useRulesWorkspace();
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [message, setMessage] = useState<ScreenMessage | null>(null);
  const [sampleMerchant, setSampleMerchant] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const form = useForm<MerchantRuleFormValues>({
    defaultValues: createEmptyMerchantRuleFormValues(),
    resolver: zodResolver(merchantRuleFormSchema),
  });

  const defaultCategoryId = workspace?.categories[0]?.id ?? null;

  function resetRuleForm() {
    setEditingRuleId(null);
    form.reset(createEmptyMerchantRuleFormValues(defaultCategoryId));
  }

  useEffect(() => {
    if (!workspace || workspace.categories.length === 0) {
      return;
    }

    if (!editingRuleId) {
      form.reset(createEmptyMerchantRuleFormValues(defaultCategoryId));
      return;
    }

    const activeRule = workspace.rules.find((rule) => rule.id === editingRuleId);

    if (!activeRule) {
      setEditingRuleId(null);
      form.reset(createEmptyMerchantRuleFormValues(defaultCategoryId));
      return;
    }

    form.reset({
      categoryId: activeRule.categoryId,
      isCaseSensitive: activeRule.isCaseSensitive,
      matchType: activeRule.matchType,
      pattern: activeRule.pattern,
      priority: activeRule.priority,
    });
  }, [defaultCategoryId, editingRuleId, form, workspace]);

  if (bootstrap.status === "booting" || !workspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Rules loading</Badge>}
          description="Preparing merchant rules, categories, and uncategorized transactions from local storage."
          eyebrow="Rules"
          title="Rules"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            Loading the local rules workspace from IndexedDB.
          </CardContent>
        </Card>
      </div>
    );
  }

  const uncategorizedTransactions = workspace.transactions.filter(
    (transaction) => !transaction.ignored && !transaction.categoryId,
  );
  const previewRows = previewMerchantRuleApplications({
    categories: workspace.categories,
    rules: workspace.rules,
    transactions: workspace.transactions,
  });
  const highestPriority =
    workspace.rules.reduce(
      (highestValue, rule) => Math.max(highestValue, rule.priority),
      0,
    ) || 0;
  const normalizedSampleMerchant = sampleMerchant
    ? normalizeMerchantName(sampleMerchant)
    : "";
  const matchedSampleRule = sampleMerchant
    ? findMatchingMerchantRule(normalizedSampleMerchant, workspace.rules)
    : null;
  const matchedSampleCategory = matchedSampleRule
    ? workspace.categories.find(
        (category) => category.id === matchedSampleRule.categoryId,
      ) ?? null
    : null;
  const rulesInPriorityOrder = [...workspace.rules].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
  const watchedMatchType = form.watch("matchType");
  const watchedCategoryId = form.watch("categoryId");
  const watchedPriority = form.watch("priority");
  const watchedPattern = form.watch("pattern");
  const watchedCaseSensitive = form.watch("isCaseSensitive");
  const selectedCategory = workspace.categories.find(
    (category) => category.id === watchedCategoryId,
  );

  const handleSaveRule = form.handleSubmit(async (values) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const savedRule = await saveMerchantRule(values, {
        ruleId: editingRuleId,
      });

      resetRuleForm();
      setMessage({
        body: `Saved rule ${savedRule.matchType} "${savedRule.pattern}".`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the merchant rule.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  });

  async function handleDeleteRule(ruleId: string, pattern: string) {
    if (!window.confirm(`Delete the rule "${pattern}"?`)) {
      return;
    }

    setDeletingRuleId(ruleId);
    setMessage(null);

    try {
      await deleteMerchantRule(ruleId);

      if (editingRuleId === ruleId) {
        resetRuleForm();
      }

      setMessage({
        body: `Deleted rule "${pattern}".`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to delete the selected rule.",
        tone: "error",
      });
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function handleApplyPreview() {
    if (previewRows.length === 0) {
      return;
    }

    if (
      !window.confirm(
        `Apply ${previewRows.length} rule matches to currently uncategorized transactions?`,
      )
    ) {
      return;
    }

    setIsApplying(true);
    setMessage(null);

    try {
      const result = await applyMerchantRulePreview(previewRows);
      setMessage({
        body: `Applied ${result.updatedCount} rule matches to uncategorized transactions.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to apply the rule preview.",
        tone: "error",
      });
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        badge={<Badge variant="accent">Rules live</Badge>}
        eyebrow="Rules"
        title="Rules"
      />

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          detail="Priority order"
          label="Saved rules"
          value={workspace.rules.length}
        />
        <SummaryMetric
          detail="Need category"
          label="Uncategorized"
          value={uncategorizedTransactions.length}
        />
        <SummaryMetric
          detail="Ready to apply"
          label="Preview matches"
          value={previewRows.length}
        />
        <SummaryMetric
          detail="Wins first"
          label="Highest priority"
          value={highestPriority}
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

      <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1.3fr)_minmax(21rem,0.92fr)]">
        <div className="grid gap-3.5">
          <WorkspaceSection
            actions={<Badge variant="outline">{workspace.rules.length} rules</Badge>}
            description="Higher priority wins first."
            title="Saved rules"
            variant="elevated"
          >
            {workspace.rules.length === 0 ? (
              <EmptyState body="No merchant rules saved yet." />
            ) : (
              <div className="space-y-2">
                <div className="text-muted hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1fr)_auto] px-3.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] xl:grid">
                  <span>Pattern</span>
                  <span>Category</span>
                  <span>Match</span>
                  <span>Updated</span>
                  <span className="text-right">Action</span>
                </div>
                <List>
                  {rulesInPriorityOrder.map((rule) => {
                    const category = workspace.categories.find(
                      (item) => item.id === rule.categoryId,
                    );

                    return (
                      <ListRow
                        aria-label={`Rule ${rule.pattern}`}
                        className="flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1fr)_auto] xl:items-center"
                        key={rule.id}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-ink truncate text-sm font-semibold tracking-tight">
                              {rule.pattern}
                            </p>
                            {rule.isCaseSensitive ? (
                              <Badge variant="outline">Case</Badge>
                            ) : null}
                          </div>
                          <p className="text-muted text-[0.75rem] leading-4 xl:hidden">
                            {matchTypeLabels[rule.matchType]} • Priority {rule.priority}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <Badge variant="outline">
                            {category?.name ?? "Missing category"}
                          </Badge>
                        </div>

                        <div className="min-w-0">
                          <p className="text-ink text-sm font-semibold">
                            {matchTypeLabels[rule.matchType]}
                          </p>
                          <p className="text-muted text-[0.75rem] leading-4">
                            Priority {rule.priority}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-muted text-sm leading-5">
                            {formatDateTime(rule.updatedAt)}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                          <Button
                            onClick={() => {
                              setEditingRuleId(rule.id);
                              setMessage(null);
                            }}
                            size="sm"
                            variant="secondary"
                          >
                            Edit
                          </Button>
                          <Button
                            disabled={deletingRuleId === rule.id}
                            onClick={() => void handleDeleteRule(rule.id, rule.pattern)}
                            size="sm"
                            variant="ghost"
                          >
                            {deletingRuleId === rule.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </ListRow>
                    );
                  })}
                </List>
              </div>
            )}
          </WorkspaceSection>
        </div>

        <div className="grid gap-3.5 xl:sticky xl:top-[4.5rem] xl:self-start">
          <WorkspaceSection
            actions={
              <Badge variant={editingRuleId ? "accent" : "outline"}>
                {editingRuleId ? "Editing" : "New rule"}
              </Badge>
            }
            description="Start narrow, then widen only when the merchant string is stable."
            title={editingRuleId ? "Edit merchant rule" : "Create merchant rule"}
            variant="muted"
          >
            {workspace.categories.length === 0 ? (
              <InfoBlock body="No active categories available yet. Add categories in Budget Setup before creating rules." />
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => void handleSaveRule(event)}
              >
                <div className="space-y-2">
                  <label
                    className="text-ink block text-sm font-semibold"
                    htmlFor="rule-pattern"
                  >
                    Pattern
                  </label>
                  <Input
                    id="rule-pattern"
                    placeholder="WHOLE FOODS"
                    {...form.register("pattern")}
                  />
                  {form.formState.errors.pattern ? (
                    <p className="text-warning text-[0.75rem] leading-4">
                      {form.formState.errors.pattern.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-ink block text-sm font-semibold"
                      htmlFor="rule-match-type"
                    >
                      Match type
                    </label>
                    <Select id="rule-match-type" {...form.register("matchType")}>
                      <option value="exact">Exact</option>
                      <option value="contains">Contains</option>
                      <option value="startsWith">Starts with</option>
                      <option value="regex">Regex</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-ink block text-sm font-semibold"
                      htmlFor="rule-category"
                    >
                      Category
                    </label>
                    <Select id="rule-category" {...form.register("categoryId")}>
                      {workspace.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-ink block text-sm font-semibold"
                      htmlFor="rule-priority"
                    >
                      Priority
                    </label>
                    <Input
                      id="rule-priority"
                      inputMode="numeric"
                      type="number"
                      {...form.register("priority", {
                        setValueAs: (value) => Number(value),
                      })}
                    />
                    {form.formState.errors.priority ? (
                      <p className="text-warning text-[0.75rem] leading-4">
                        {form.formState.errors.priority.message}
                      </p>
                    ) : null}
                  </div>

                  <label className="border-line/70 bg-panel flex min-h-[var(--control-height)] items-center gap-3 rounded-[var(--radius-control)] border px-3 text-sm">
                    <input
                      className="accent-accent size-4"
                      type="checkbox"
                      {...form.register("isCaseSensitive")}
                    />
                    Case-sensitive rule
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button disabled={isSaving} type="submit" variant="primary">
                    {isSaving
                      ? "Saving rule..."
                      : editingRuleId
                        ? "Update rule"
                        : "Save rule"}
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={resetRuleForm}
                    type="button"
                    variant="secondary"
                  >
                    Reset
                  </Button>
                </div>
              </form>
            )}
          </WorkspaceSection>

          <WorkspaceSection title="Workspace snapshot" variant="muted">
            <List>
              <SnapshotRow
                label="Editor state"
                secondary="Current panel"
                value={editingRuleId ? "Editing" : "Create"}
              />
              <SnapshotRow
                label="Match type"
                secondary="Current form"
                value={matchTypeLabels[watchedMatchType]}
              />
              <SnapshotRow
                label="Category"
                secondary="Current form"
                value={selectedCategory?.name ?? "None"}
              />
              <SnapshotRow
                label="Priority"
                secondary="Current form"
                value={String(watchedPriority)}
              />
              <SnapshotRow
                label="Pattern"
                secondary="Current form"
                value={watchedPattern.trim() || "Empty"}
              />
              <SnapshotRow
                label="Case sensitive"
                secondary="Current form"
                value={watchedCaseSensitive ? "Yes" : "No"}
              />
            </List>
          </WorkspaceSection>

          <WorkspaceSection
            actions={
              previewRows.length > 0 ? (
                <Button
                  disabled={isApplying}
                  onClick={() => void handleApplyPreview()}
                  size="sm"
                  variant="primary"
                >
                  {isApplying ? "Applying..." : `Apply ${previewRows.length}`}
                </Button>
              ) : null
            }
            title="Apply preview"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">{previewRows.length} matches</Badge>
                <Badge variant="outline">
                  {uncategorizedTransactions.length} uncategorized
                </Badge>
              </div>

              {previewRows.length === 0 ? (
                <EmptyState body="No current rule matches are waiting to be applied." />
              ) : (
                <div className="space-y-2">
                  <div className="border-line/80 overflow-hidden rounded-[var(--radius-panel)] border">
                    <div className="max-h-[24rem] overflow-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-panel-strong/45 text-muted">
                          <tr>
                            <th className="px-3.5 py-2.5 font-semibold">Merchant</th>
                            <th className="px-3.5 py-2.5 font-semibold">Rule</th>
                            <th className="px-3.5 py-2.5 font-semibold">Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-line/70 bg-panel divide-y">
                          {previewRows.map((row) => (
                            <tr key={row.transactionId}>
                              <td className="px-3.5 py-3 align-top">
                                <div className="space-y-0.5">
                                  <p className="text-ink text-sm font-semibold">
                                    {row.merchantRaw}
                                  </p>
                                  <p className="text-muted text-[0.75rem] leading-4">
                                    {row.date} • {formatMinorUnits(row.amount)}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3.5 py-3 align-top">
                                <Badge variant="outline">{row.ruleLabel}</Badge>
                              </td>
                              <td className="text-muted px-3.5 py-3 align-top">
                                {row.categoryName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <InfoBlock body="Only uncategorized transactions are touched when you apply this preview." />
                </div>
              )}
            </div>
          </WorkspaceSection>

          <WorkspaceSection title="Rule tester">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  className="text-ink block text-sm font-semibold"
                  htmlFor="sample-merchant"
                >
                  Sample merchant
                </label>
                <Input
                  id="sample-merchant"
                  onChange={(event) => setSampleMerchant(event.target.value)}
                  placeholder="Whole Foods Market"
                  value={sampleMerchant}
                />
              </div>

              {sampleMerchant ? (
                <List>
                  <ListRow className="flex-col gap-1">
                    <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
                      Normalized merchant
                    </p>
                    <p className="text-ink text-sm font-semibold">
                      {normalizedSampleMerchant}
                    </p>
                  </ListRow>
                  <ListRow className="flex-col gap-1">
                    <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
                      Match result
                    </p>
                    {matchedSampleRule && matchedSampleCategory ? (
                      <>
                        <p className="text-ink text-sm font-semibold">
                          {matchTypeLabels[matchedSampleRule.matchType]}{" "}
                          {matchedSampleRule.pattern}
                        </p>
                        <p className="text-muted text-[0.8125rem] leading-5">
                          Category: {matchedSampleCategory.name} • Priority {matchedSampleRule.priority}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted text-[0.8125rem] leading-5">
                        No saved rule matches this merchant yet.
                      </p>
                    )}
                  </ListRow>
                </List>
              ) : (
                <EmptyState body="Enter a merchant string to test it against the current saved rules." />
              )}
            </div>
          </WorkspaceSection>
        </div>
      </section>
    </div>
  );
}
