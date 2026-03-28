"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">Rules live</Badge>}
        description="Create, test, and apply merchant rules locally. The saved-rule list stays primary, while edits and bulk application stay explicit and reviewable."
        eyebrow="Rules"
        title="Rules"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Saved rules" value={workspace.rules.length} />
        <SummaryMetric
          label="Uncategorized"
          value={uncategorizedTransactions.length}
        />
        <SummaryMetric label="Preview matches" value={previewRows.length} />
        <SummaryMetric label="Highest priority" value={highestPriority} />
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

      <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="grid gap-4">
          <Card variant="elevated">
            <CardHeader className="border-b border-line/60">
              <CardTitle>Saved rules</CardTitle>
              <CardDescription>
                Higher priority wins. Keep patterns narrow unless you have a
                stable merchant string to broaden safely.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {workspace.rules.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/25 text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  No merchant rules saved yet.
                </div>
              ) : (
                <List>
                  {workspace.rules.map((rule) => {
                    const category = workspace.categories.find(
                      (item) => item.id === rule.categoryId,
                    );

                    return (
                      <ListRow
                        aria-label={`Rule ${rule.pattern}`}
                        className="items-center gap-3"
                        key={rule.id}
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-ink truncate text-sm font-semibold tracking-tight">
                              {rule.pattern}
                            </p>
                            <Badge variant="outline">
                              {category?.name ?? "Missing category"}
                            </Badge>
                          </div>
                          <p className="text-muted text-sm leading-5">
                            {matchTypeLabels[rule.matchType]} • Priority {rule.priority}
                            {rule.isCaseSensitive ? " • Case sensitive" : ""}
                          </p>
                          <p className="text-muted text-sm leading-5">
                            Updated {formatDateTime(rule.updatedAt)}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
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
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Apply rules to uncategorized transactions</CardTitle>
              <CardDescription>
                Only uncategorized history is touched, and only after you review
                the proposed matches below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent">{previewRows.length} matches ready</Badge>
                <Badge variant="outline">
                  {uncategorizedTransactions.length} uncategorized transactions
                </Badge>
              </div>

              {previewRows.length === 0 ? (
                <div className="border-line/70 bg-panel-strong/25 text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  No current rule matches are waiting to be applied.
                </div>
              ) : (
                <>
                  <div className="border-line/80 overflow-hidden rounded-xl border">
                    <div className="max-h-[28rem] overflow-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-panel-strong/55 text-muted">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Merchant</th>
                            <th className="px-4 py-3 font-semibold">Amount</th>
                            <th className="px-4 py-3 font-semibold">Rule</th>
                            <th className="px-4 py-3 font-semibold">Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-line/70 bg-panel divide-y">
                          {previewRows.map((row) => (
                            <tr key={row.transactionId}>
                              <td className="text-muted px-4 py-3 align-top">
                                {row.date}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="space-y-1">
                                  <p className="text-ink font-medium">
                                    {row.merchantRaw}
                                  </p>
                                  <p className="text-muted text-xs uppercase tracking-[0.18em]">
                                    {row.merchantNormalized}
                                  </p>
                                </div>
                              </td>
                              <td className="text-muted px-4 py-3 align-top">
                                {formatMinorUnits(row.amount)}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <Badge variant="outline">{row.ruleLabel}</Badge>
                              </td>
                              <td className="text-muted px-4 py-3 align-top">
                                {row.categoryName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Button
                    disabled={isApplying}
                    onClick={() => void handleApplyPreview()}
                    variant="primary"
                  >
                    {isApplying
                      ? "Applying matches..."
                      : `Apply ${previewRows.length} matches`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:sticky xl:top-6 xl:self-start">
          <Card variant="muted">
            <CardHeader className="border-b border-line/60">
              <CardTitle>
                {editingRuleId ? "Edit merchant rule" : "Create merchant rule"}
              </CardTitle>
              <CardDescription>
                Start with exact corrections first. Widen a pattern only when
                the merchant string is demonstrably stable.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
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
                    <p className="text-warning text-sm">
                      {form.formState.errors.pattern.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                      <p className="text-warning text-sm">
                        {form.formState.errors.priority.message}
                      </p>
                    ) : null}
                  </div>

                  <label className="border-line/70 bg-panel flex items-center gap-3 rounded-xl border px-4 py-3 text-sm leading-6">
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
                    variant="secondary"
                  >
                    Reset form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Rule tester</CardTitle>
              <CardDescription>
                Test a merchant string against the current saved rules before
                applying anything to history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
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
                        <p className="text-muted text-sm leading-5">
                          Category: {matchedSampleCategory.name} • Priority{" "}
                          {matchedSampleRule.priority}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted text-sm leading-5">
                        No saved rule matches this merchant yet.
                      </p>
                    )}
                  </ListRow>
                </List>
              ) : (
                <div className="border-line/70 bg-panel-strong/25 text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                  Enter a merchant string to test it against the current rules.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
