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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Saved rules</CardDescription>
            <CardTitle className="text-2xl">
              {workspace.rules.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Historical imports</CardDescription>
            <CardTitle className="text-2xl">
              {workspace.statementImports.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Known fingerprints</CardDescription>
            <CardTitle className="text-2xl">
              {workspace.transactions.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>Active categories</CardDescription>
            <CardTitle className="text-2xl">
              {workspace.categories.length}
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

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Stage a statement</CardTitle>
            <CardDescription>
              Upload a CSV or XLSX statement, confirm the mapping, review every
              row, and only then save the import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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
                Required columns: date, merchant, and either one amount column
                or separate debit and credit columns.
              </p>
            </div>

            {isParsing ? (
              <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-3 text-sm leading-6">
                Reading the statement locally and preparing the staging review.
              </div>
            ) : null}

            {preview ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                    <p className="text-muted text-sm">Rows detected</p>
                    <p className="text-ink mt-1 text-lg font-semibold tracking-tight">
                      {preview.totalRowCount}
                    </p>
                  </div>
                  <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                    <p className="text-muted text-sm">Ready to import</p>
                    <p className="text-ink mt-1 text-lg font-semibold tracking-tight">
                      {preview.readyRowCount}
                    </p>
                  </div>
                  <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                    <p className="text-muted text-sm">Duplicates skipped</p>
                    <p className="text-ink mt-1 text-lg font-semibold tracking-tight">
                      {preview.duplicateRowCount}
                    </p>
                  </div>
                  <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                    <p className="text-muted text-sm">Uncategorized</p>
                    <p className="text-ink mt-1 text-lg font-semibold tracking-tight">
                      {preview.uncategorizedRowCount}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-ink text-base font-semibold tracking-tight">
                      Column mapping
                    </h3>
                    <p className="text-muted mt-1 text-sm leading-6">
                      Adjust the mapping if the auto-detected headers do not look
                      right. The staging table updates immediately.
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
                          <div
                            className="border-warning/30 text-warning rounded-[22px] border bg-orange-50 px-4 py-3 text-sm leading-6"
                            key={`${issue.field}-${issue.message}`}
                          >
                            {issue.message}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-ink text-base font-semibold tracking-tight">
                        Staging review
                      </h3>
                      <p className="text-muted mt-1 text-sm leading-6">
                        Ready rows will be imported. Duplicate and invalid rows
                        remain visible and are skipped.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          preview.blockingErrorCount > 0 ? "warning" : "accent"
                        }
                      >
                        {preview.sourceFormat.toUpperCase()}
                      </Badge>
                      {preview.primaryMonthKey ? (
                        <Badge variant="outline">
                          Primary month {preview.primaryMonthKey}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-line/80 overflow-hidden rounded-[24px] border">
                    <div className="max-h-[34rem] overflow-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-panel-strong/55 text-muted">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Row</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Merchant</th>
                            <th className="px-4 py-3 font-semibold">Amount</th>
                            <th className="px-4 py-3 font-semibold">Category</th>
                            <th className="px-4 py-3 font-semibold">Match</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-line/70 bg-panel divide-y">
                          {preview.rows.map((row) => {
                            const transaction = row.transaction;
                            const availableCategories = workspace.categories.filter(
                              (category) =>
                                category.kind === transaction?.direction,
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
                                selectedCategoryForRule !==
                                  transaction.categoryId);

                            return (
                              <tr
                                className={cn(
                                  row.status !== "ready" &&
                                    "bg-panel-strong/25",
                                )}
                                key={row.rowNumber}
                              >
                                <td className="text-muted px-4 py-3 align-top">
                                  {row.rowNumber}
                                </td>
                                <td className="text-muted px-4 py-3 align-top">
                                  {transaction?.date ?? "Needs review"}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="space-y-1">
                                    <p className="text-ink font-medium">
                                      {transaction?.merchantRaw ??
                                        row.raw[mapping.merchant ?? ""] ??
                                        "Needs review"}
                                    </p>
                                    {transaction ? (
                                      <p className="text-muted text-xs uppercase tracking-[0.18em]">
                                        {transaction.merchantNormalized}
                                      </p>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="text-muted px-4 py-3 align-top">
                                  {transaction
                                    ? formatMinorUnits(transaction.amount)
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  {transaction ? (
                                    <div className="space-y-2">
                                      <Select
                                        disabled={row.status !== "ready" || isSaving}
                                        onChange={(event) =>
                                          setCategoryOverrides(
                                            (currentOverrides) => ({
                                              ...currentOverrides,
                                              [row.rowNumber]:
                                                event.target.value ===
                                                "__uncategorized__"
                                                  ? null
                                                  : event.target.value,
                                            }),
                                          )
                                        }
                                        value={selectedCategoryId}
                                      >
                                        <option value="__uncategorized__">
                                          Uncategorized
                                        </option>
                                        {availableCategories.map((category) => (
                                          <option
                                            key={category.id}
                                            value={category.id}
                                          >
                                            {category.name}
                                          </option>
                                        ))}
                                      </Select>
                                      {canSaveRuleFromCorrection ? (
                                        <Button
                                          disabled={
                                            savingRuleRowNumber === row.rowNumber
                                          }
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
                                <td className="px-4 py-3 align-top">
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
                                <td className="px-4 py-3 align-top">
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
              </>
            ) : (
              <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                No statement staged yet. Upload a CSV or XLSX file to begin the
                local review flow.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Import safety rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                Files are parsed locally in the browser and never sent to an
                external service.
              </div>
              <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                Duplicate detection uses normalized merchant, date, direction,
                and amount fingerprints.
              </div>
              <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                Saved rules can prefill categories, but every staged row stays
                visible before save.
              </div>
            </CardContent>
          </Card>

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
                <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-4 text-sm leading-6">
                  No statement imports saved yet.
                </div>
              ) : (
                workspace.statementImports.map((statementImport) => (
                  <article
                    aria-label={`${statementImport.fileName} import record`}
                    className="border-line/70 bg-panel-strong/35 space-y-3 rounded-[24px] border p-4"
                    key={statementImport.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-ink font-semibold tracking-tight">
                          {statementImport.fileName}
                        </p>
                        <p className="text-muted text-sm leading-6">
                          {formatMonthKeyLabel(
                            statementImport.monthKey,
                            workspace.locale,
                            workspace.monthStartDay,
                          )}{" "}
                          • imported{" "}
                          {formatDateTime(statementImport.importedAt)}
                        </p>
                      </div>
                      <Badge
                        variant={getImportStatusBadgeVariant(
                          statementImport.status,
                        )}
                      >
                        {statementImport.status}
                      </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-muted text-xs uppercase tracking-[0.18em]">
                          Imported rows
                        </p>
                        <p className="text-ink mt-1 font-semibold">
                          {statementImport.importedRowCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted text-xs uppercase tracking-[0.18em]">
                          Duplicate rows
                        </p>
                        <p className="text-ink mt-1 font-semibold">
                          {statementImport.duplicateRowCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted text-xs uppercase tracking-[0.18em]">
                          Warnings
                        </p>
                        <p className="text-ink mt-1 font-semibold">
                          {statementImport.warningCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted text-xs uppercase tracking-[0.18em]">
                          Source format
                        </p>
                        <p className="text-ink mt-1 font-semibold uppercase">
                          {statementImport.sourceFormat}
                        </p>
                      </div>
                    </div>

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
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
