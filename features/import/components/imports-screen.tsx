"use client";

import { useState } from "react";

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
import {
  buildStatementImportPreview,
  createStatementImportMapping,
  parseStatementImportFile,
  statementImportFieldLabels,
  type StatementImportField,
  type StatementImportRawData,
  type StagedStatementTransaction,
} from "@/features/import/lib/statement-import";
import {
  commitStatementImport,
  deleteStatementImportRecord,
  rollbackStatementImport,
} from "@/features/import/lib/statement-import-service";
import { useImportWorkspace } from "@/features/import/hooks/use-import-workspace";
import { formatMonthKeyLabel } from "@/lib/date";
import { saveMerchantRuleFromCorrection } from "@/features/rules/lib/rules-service";
import { formatMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";

type ScreenMessage = {
  body: string;
  tone: "error" | "success";
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getImportStatusBadgeVariant(status: string) {
  switch (status) {
    case "committed":
      return "accent" as const;
    case "rolled_back":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

function getRowStatusBadgeVariant(status: "duplicate" | "invalid" | "ready") {
  switch (status) {
    case "ready":
      return "accent" as const;
    case "duplicate":
      return "default" as const;
    case "invalid":
      return "warning" as const;
  }
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

export function ImportsScreen() {
  const bootstrap = useAppBootstrap();
  const workspace = useImportWorkspace();
  const [message, setMessage] = useState<ScreenMessage | null>(null);
  const [importData, setImportData] = useState<StatementImportRawData | null>(
    null,
  );
  const [mapping, setMapping] = useState(createStatementImportMapping([]));
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<number, string | null>
  >({});
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingRuleRowNumber, setSavingRuleRowNumber] = useState<number | null>(
    null,
  );
  const [deletingImportId, setDeletingImportId] = useState<string | null>(null);
  const [rollingBackImportId, setRollingBackImportId] = useState<string | null>(
    null,
  );

  const preview =
    importData && workspace
      ? buildStatementImportPreview({
          categories: workspace.categories,
          existingImports: workspace.statementImports,
          existingTransactions: workspace.transactions,
          mapping,
          monthStartDay: workspace.monthStartDay,
          rules: workspace.rules,
          source: importData,
        })
      : null;
  const canSaveImport =
    !!preview &&
    preview.readyRowCount > 0 &&
    preview.blockingErrorCount === 0 &&
    !isSaving;

  async function handleFileSelection(file: File | null) {
    if (!file) {
      setImportData(null);
      setMapping(createStatementImportMapping([]));
      setCategoryOverrides({});
      setMessage(null);
      return;
    }

    setIsParsing(true);
    setMessage(null);
    setCategoryOverrides({});

    try {
      const parsedImport = await parseStatementImportFile(file);
      setImportData(parsedImport);
      setMapping(createStatementImportMapping(parsedImport.headers));
    } catch (error) {
      setImportData(null);
      setMapping(createStatementImportMapping([]));
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to read the selected statement file.",
        tone: "error",
      });
    } finally {
      setIsParsing(false);
    }
  }

  async function handleCommitImport() {
    if (!preview) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const normalizedOverrides = Object.fromEntries(
        Object.entries(categoryOverrides).map(([rowNumber, categoryId]) => [
          Number(rowNumber),
          categoryId,
        ]),
      );

      const result = await commitStatementImport({
        categoryOverrides: normalizedOverrides,
        preview,
      });

      setImportData(null);
      setMapping(createStatementImportMapping([]));
      setCategoryOverrides({});
      setMessage({
        body: `Imported ${result.transactions.length} transactions from ${result.statementImport.fileName}. Duplicate rows were skipped safely.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the staged statement import.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRollback(importId: string, fileName: string) {
    if (
      !window.confirm(
        `Roll back ${fileName}? Imported transactions from this file will be removed and monthly snapshots will be recalculated.`,
      )
    ) {
      return;
    }

    setRollingBackImportId(importId);
    setMessage(null);

    try {
      await rollbackStatementImport(importId);
      setMessage({
        body: `Rolled back ${fileName} and recalculated the affected months.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to roll back the selected import.",
        tone: "error",
      });
    } finally {
      setRollingBackImportId(null);
    }
  }

  async function handleSaveRuleFromCorrection(
    rowNumber: number,
    categoryId: string,
    merchantRaw: string,
    transaction: StagedStatementTransaction,
  ) {
    setSavingRuleRowNumber(rowNumber);
    setMessage(null);

    try {
      const result = await saveMerchantRuleFromCorrection({
        categoryId,
        transaction,
      });
      setMessage({
        body: `${result.action === "created" ? "Created" : "Updated"} an exact rule for ${merchantRaw}.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the merchant rule from this correction.",
        tone: "error",
      });
    } finally {
      setSavingRuleRowNumber(null);
    }
  }

  async function handleDeleteImportRecord(importId: string, fileName: string) {
    if (
      !window.confirm(
        `Delete the saved record for ${fileName}? This does not restore transactions; it only removes the rolled-back import history entry.`,
      )
    ) {
      return;
    }

    setDeletingImportId(importId);
    setMessage(null);

    try {
      await deleteStatementImportRecord(importId);
      setMessage({
        body: `Deleted the import record for ${fileName}.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to delete the selected import record.",
        tone: "error",
      });
    } finally {
      setDeletingImportId(null);
    }
  }

  if (bootstrap.status === "booting" || !workspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Imports loading</Badge>}
          description="Preparing the local statement import workspace with categories, rules, and historical fingerprints."
          eyebrow="Imports"
          title="Imports"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            Loading the local import workspace from IndexedDB.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">Phase 11 ready</Badge>}
        description="Import monthly card statements locally, inspect every staged transaction, skip duplicates safely, and confirm categories before anything is written."
        eyebrow="Imports"
        title="Imports"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Saved rules" value={workspace.rules.length} />
        <SummaryMetric
          label="Historical imports"
          value={workspace.statementImports.length}
        />
        <SummaryMetric
          label="Known fingerprints"
          value={workspace.transactions.length}
        />
        <SummaryMetric
          label="Active categories"
          value={workspace.categories.length}
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

      <Card variant="muted">
        <CardHeader className="flex flex-col gap-3 border-b border-line/60 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Upload and map statement</CardTitle>
            <CardDescription>
              Choose a CSV or XLSX file, confirm the headers, and keep the table
              review as the main place to validate the import.
            </CardDescription>
          </div>
          {preview ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{preview.sourceFormat.toUpperCase()}</Badge>
              {preview.primaryMonthKey ? (
                <Badge variant="outline">
                  Primary month {preview.primaryMonthKey}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="space-y-2">
            <label
              className="text-ink block text-sm font-semibold"
              htmlFor="statement-import-file"
            >
              Statement file
            </label>
            <Input
              accept=".csv,.xlsx"
              disabled={isParsing || isSaving}
              id="statement-import-file"
              onChange={(event) =>
                void handleFileSelection(event.target.files?.[0] ?? null)
              }
              type="file"
            />
            <p className="text-muted text-sm leading-6">
              Required columns: date, merchant, and either one amount column or
              separate debit and credit columns.
            </p>
          </div>

          {isParsing ? (
            <div className="border-line/70 bg-panel text-muted rounded-xl border px-4 py-3 text-sm leading-6">
              Reading the statement locally and preparing the staging review.
            </div>
          ) : null}

          {preview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryMetric label="Rows detected" value={preview.totalRowCount} />
                <SummaryMetric label="Ready to import" value={preview.readyRowCount} />
                <SummaryMetric
                  label="Duplicates skipped"
                  value={preview.duplicateRowCount}
                />
                <SummaryMetric
                  label="Uncategorized"
                  value={preview.uncategorizedRowCount}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-ink text-base font-semibold tracking-tight">
                    Column mapping
                  </h3>
                  <p className="text-muted mt-1 text-sm leading-6">
                    Adjust the mapping if the auto-detected headers do not look
                    right. The staging review updates immediately.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(statementImportFieldLabels).map(
                    ([fieldKey, label]) => {
                      const field = fieldKey as StatementImportField;

                      return (
                        <div className="space-y-2" key={field}>
                          <label
                            className="text-ink block text-sm font-semibold"
                            htmlFor={`statement-import-mapping-${field}`}
                          >
                            {label}
                          </label>
                          <Select
                            disabled={isSaving}
                            id={`statement-import-mapping-${field}`}
                            onChange={(event) => {
                              setCategoryOverrides({});
                              setMapping((currentMapping) => ({
                                ...currentMapping,
                                [field]:
                                  event.target.value === "__none__"
                                    ? null
                                    : event.target.value,
                              }));
                            }}
                            value={mapping[field] ?? "__none__"}
                          >
                            <option value="__none__">Not mapped</option>
                            {preview.headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </Select>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {preview.issues.some((issue) => issue.rowNumber === null) ? (
                <div className="space-y-2">
                  <h3 className="text-ink text-base font-semibold tracking-tight">
                    Blocking review items
                  </h3>
                  <div className="space-y-2">
                    {preview.issues
                      .filter((issue) => issue.rowNumber === null)
                      .map((issue) => (
                        <Notice
                          className="rounded-xl px-4 py-3"
                          key={`${issue.field}-${issue.message}`}
                          tone="warning"
                        >
                          {issue.message}
                        </Notice>
                      ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="border-line/70 bg-panel text-muted rounded-xl border px-4 py-4 text-sm leading-6">
              No statement staged yet. Upload a CSV or XLSX file to begin the
              local review flow.
            </div>
          )}
        </CardContent>
      </Card>

      {preview ? (
        <Card variant="elevated">
          <CardHeader className="flex flex-col gap-4 border-b border-line/60 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <CardTitle>Staging review</CardTitle>
              <CardDescription>
                Ready rows will be imported. Duplicate and invalid rows remain
                visible so the import stays explicit.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!canSaveImport}
                onClick={() => void handleCommitImport()}
                variant="primary"
              >
                {isSaving ? "Saving import..." : "Save import"}
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => {
                  setImportData(null);
                  setMapping(createStatementImportMapping([]));
                  setCategoryOverrides({});
                  setMessage(null);
                }}
                variant="secondary"
              >
                Clear staging
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="text-muted hidden grid-cols-[auto_minmax(0,0.9fr)_minmax(0,1.4fr)_auto_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] px-4 text-xs font-semibold uppercase tracking-[0.16em] xl:grid">
              <span>Row</span>
              <span>Date</span>
              <span>Merchant</span>
              <span>Amount</span>
              <span>Category</span>
              <span>Match</span>
              <span>Status</span>
            </div>

            <div className="border-line/80 overflow-hidden rounded-xl border">
              <div className="max-h-[38rem] overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-panel-strong/45 text-muted xl:hidden">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Review rows</th>
                    </tr>
                  </thead>
                  <tbody className="divide-line/70 bg-panel divide-y">
                    {preview.rows.map((row) => {
                      const transaction = row.transaction;
                      const availableCategories = workspace.categories.filter(
                        (category) => category.kind === transaction?.direction,
                      );
                      const selectedCategoryId =
                        categoryOverrides[row.rowNumber] ??
                        transaction?.categoryId ??
                        "__uncategorized__";
                      const selectedCategoryForRule =
                        selectedCategoryId === "__uncategorized__"
                          ? null
                          : selectedCategoryId;
                      const canSaveRuleFromCorrection =
                        row.status === "ready" &&
                        !!transaction &&
                        !!selectedCategoryForRule &&
                        (transaction.matchedRuleId === null ||
                          selectedCategoryForRule !== transaction.categoryId);

                      return (
                        <tr
                          aria-label={`Staged import row ${row.rowNumber} for ${
                            transaction?.merchantRaw ??
                            row.raw[mapping.merchant ?? ""] ??
                            "Needs review"
                          }`}
                          className={cn(
                            row.status !== "ready" && "bg-panel-strong/20",
                          )}
                          key={row.rowNumber}
                        >
                          <td className="px-4 py-3 align-top xl:hidden">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={getRowStatusBadgeVariant(row.status)}>
                                  {row.status === "ready"
                                    ? "Ready"
                                    : row.status === "duplicate"
                                      ? "Duplicate"
                                      : "Needs review"}
                                </Badge>
                                <Badge variant="outline">Row {row.rowNumber}</Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="text-ink font-medium">
                                  {transaction?.merchantRaw ??
                                    row.raw[mapping.merchant ?? ""] ??
                                    "Needs review"}
                                </p>
                                <p className="text-muted text-sm leading-5">
                                  {transaction?.date ?? "Needs review"} •{" "}
                                  {transaction
                                    ? formatMinorUnits(transaction.amount)
                                    : "—"}
                                </p>
                              </div>
                              <div className="space-y-2">
                                {transaction ? (
                                  <>
                                    <Select
                                      disabled={row.status !== "ready" || isSaving}
                                      onChange={(event) =>
                                        setCategoryOverrides((currentOverrides) => ({
                                          ...currentOverrides,
                                          [row.rowNumber]:
                                            event.target.value === "__uncategorized__"
                                              ? null
                                              : event.target.value,
                                        }))
                                      }
                                      value={selectedCategoryId}
                                    >
                                      <option value="__uncategorized__">
                                        Uncategorized
                                      </option>
                                      {availableCategories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                          {category.name}
                                        </option>
                                      ))}
                                    </Select>
                                    {canSaveRuleFromCorrection ? (
                                      <Button
                                        disabled={savingRuleRowNumber === row.rowNumber}
                                        onClick={() =>
                                          void handleSaveRuleFromCorrection(
                                            row.rowNumber,
                                            selectedCategoryForRule,
                                            transaction.merchantRaw,
                                            transaction,
                                          )
                                        }
                                        size="sm"
                                        variant="secondary"
                                      >
                                        {savingRuleRowNumber === row.rowNumber
                                          ? "Saving rule..."
                                          : "Save as exact rule"}
                                      </Button>
                                    ) : null}
                                  </>
                                ) : (
                                  <p className="text-muted text-sm">Needs review</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                {transaction?.matchedRuleLabel ? (
                                  <>
                                    <Badge variant="outline">Rule match</Badge>
                                    <p className="text-muted text-xs leading-5">
                                      {transaction.matchedRuleLabel}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-muted text-xs leading-5">
                                    No saved rule
                                  </p>
                                )}
                                {row.issues.map((issue) => (
                                  <p
                                    className="text-muted text-xs leading-5"
                                    key={`${row.rowNumber}-${issue.field}-${issue.message}`}
                                  >
                                    {issue.message}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </td>

                          <td className="text-muted hidden px-4 py-3 align-top xl:table-cell">
                            {row.rowNumber}
                          </td>
                          <td className="text-muted hidden px-4 py-3 align-top xl:table-cell">
                            {transaction?.date ?? "Needs review"}
                          </td>
                          <td className="hidden px-4 py-3 align-top xl:table-cell">
                            <div className="space-y-1">
                              <p className="text-ink font-medium">
                                {transaction?.merchantRaw ??
                                  row.raw[mapping.merchant ?? ""] ??
                                  "Needs review"}
                              </p>
                              {transaction ? (
                                <p className="text-muted text-xs uppercase tracking-[0.14em]">
                                  {transaction.merchantNormalized}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="text-muted hidden px-4 py-3 align-top xl:table-cell">
                            {transaction ? formatMinorUnits(transaction.amount) : "—"}
                          </td>
                          <td className="hidden px-4 py-3 align-top xl:table-cell">
                            {transaction ? (
                              <div className="space-y-2">
                                <Select
                                  disabled={row.status !== "ready" || isSaving}
                                  onChange={(event) =>
                                    setCategoryOverrides((currentOverrides) => ({
                                      ...currentOverrides,
                                      [row.rowNumber]:
                                        event.target.value === "__uncategorized__"
                                          ? null
                                          : event.target.value,
                                    }))
                                  }
                                  value={selectedCategoryId}
                                >
                                  <option value="__uncategorized__">
                                    Uncategorized
                                  </option>
                                  {availableCategories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </Select>
                                {canSaveRuleFromCorrection ? (
                                  <Button
                                    disabled={savingRuleRowNumber === row.rowNumber}
                                    onClick={() =>
                                      void handleSaveRuleFromCorrection(
                                        row.rowNumber,
                                        selectedCategoryForRule,
                                        transaction.merchantRaw,
                                        transaction,
                                      )
                                    }
                                    size="sm"
                                    variant="secondary"
                                  >
                                    {savingRuleRowNumber === row.rowNumber
                                      ? "Saving rule..."
                                      : "Save as exact rule"}
                                  </Button>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 align-top xl:table-cell">
                            {transaction?.matchedRuleLabel ? (
                              <div className="space-y-1">
                                <Badge variant="outline">Rule match</Badge>
                                <p className="text-muted text-xs leading-5">
                                  {transaction.matchedRuleLabel}
                                </p>
                              </div>
                            ) : (
                              <p className="text-muted text-xs leading-5">
                                No saved rule
                              </p>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 align-top xl:table-cell">
                            <div className="space-y-2">
                              <Badge
                                variant={getRowStatusBadgeVariant(row.status)}
                              >
                                {row.status === "ready"
                                  ? "Ready"
                                  : row.status === "duplicate"
                                    ? "Duplicate"
                                    : "Needs review"}
                              </Badge>
                              {row.issues.map((issue) => (
                                <p
                                  className="text-muted max-w-xs text-xs leading-5"
                                  key={`${row.rowNumber}-${issue.field}-${issue.message}`}
                                >
                                  {issue.message}
                                </p>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Import history</CardTitle>
            <CardDescription>
              Recent local statement imports, with rollback for committed
              non-demo imports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace.statementImports.length === 0 ? (
              <div className="border-line/70 bg-panel-strong/35 text-muted rounded-xl border px-4 py-4 text-sm leading-6">
                No statement imports saved yet.
              </div>
            ) : (
              <List>
                {workspace.statementImports.map((statementImport) => (
                  <ListRow
                    aria-label={`${statementImport.fileName} import record`}
                    className="gap-4"
                    key={statementImport.id}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-ink truncate text-sm font-semibold tracking-tight sm:text-base">
                          {statementImport.fileName}
                        </p>
                        <Badge
                          variant={getImportStatusBadgeVariant(statementImport.status)}
                        >
                          {statementImport.status}
                        </Badge>
                      </div>
                      <p className="text-muted text-sm leading-5">
                        {formatMonthKeyLabel(
                          statementImport.monthKey,
                          workspace.locale,
                          workspace.monthStartDay,
                        )}{" "}
                        • imported {formatDateTime(statementImport.importedAt)}
                      </p>
                      <p className="text-muted text-sm leading-5">
                        {statementImport.importedRowCount} imported •{" "}
                        {statementImport.duplicateRowCount} duplicates •{" "}
                        {statementImport.warningCount} warnings •{" "}
                        {statementImport.sourceFormat.toUpperCase()}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {statementImport.status === "committed" &&
                      statementImport.sourceFormat !== "seed" ? (
                        <Button
                          disabled={rollingBackImportId === statementImport.id}
                          onClick={() =>
                            void handleRollback(
                              statementImport.id,
                              statementImport.fileName,
                            )
                          }
                          size="sm"
                          variant="secondary"
                        >
                          {rollingBackImportId === statementImport.id
                            ? "Rolling back..."
                            : "Roll back import"}
                        </Button>
                      ) : null}

                      {statementImport.status !== "committed" &&
                      statementImport.sourceFormat !== "seed" ? (
                        <Button
                          disabled={deletingImportId === statementImport.id}
                          onClick={() =>
                            void handleDeleteImportRecord(
                              statementImport.id,
                              statementImport.fileName,
                            )
                          }
                          size="sm"
                          variant="ghost"
                        >
                          {deletingImportId === statementImport.id
                            ? "Deleting..."
                            : "Delete record"}
                        </Button>
                      ) : null}
                    </div>
                  </ListRow>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card variant="muted">
          <CardHeader>
            <CardTitle>Import safety rules</CardTitle>
            <CardDescription>
              Keep these constraints visible while reviewing staged rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6">
            <div className="border-line/70 bg-panel rounded-xl border px-4 py-3">
              Files are parsed locally in the browser and never sent to an
              external service.
            </div>
            <div className="border-line/70 bg-panel rounded-xl border px-4 py-3">
              Duplicate detection uses normalized merchant, date, direction, and
              amount fingerprints.
            </div>
            <div className="border-line/70 bg-panel rounded-xl border px-4 py-3">
              Saved rules can prefill categories, but every staged row stays
              visible before save.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
