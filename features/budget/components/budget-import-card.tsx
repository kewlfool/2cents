"use client";

import { useState } from "react";

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
import { formatMinorUnits } from "@/lib/money";

import type { BudgetBaselineDraftCategory } from "@/features/budget/lib/budget-form";
import {
  buildBudgetImportPreview,
  budgetImportFieldLabels,
  createBudgetImportMapping,
  parseBudgetImportFile,
  requiredBudgetImportFields,
  type BudgetImportField,
  type BudgetImportRawData,
} from "@/features/budget/lib/budget-import";

type BudgetImportCardProps = {
  disabled?: boolean;
  onApplyImport: (categories: BudgetBaselineDraftCategory[]) => Promise<void>;
};

type ImportMessage = {
  body: string;
  tone: "error" | "success";
};

export function BudgetImportCard({
  disabled = false,
  onApplyImport,
}: BudgetImportCardProps) {
  const [importData, setImportData] = useState<BudgetImportRawData | null>(
    null,
  );
  const [mapping, setMapping] = useState(createBudgetImportMapping([]));
  const [isApplying, setIsApplying] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [message, setMessage] = useState<ImportMessage | null>(null);

  const preview = importData
    ? buildBudgetImportPreview(importData, mapping)
    : null;
  const canSaveImport =
    !disabled &&
    !isApplying &&
    !!preview &&
    preview.categories.length > 0 &&
    preview.errorCount === 0;

  async function handleFileSelection(file: File | null) {
    if (!file) {
      setImportData(null);
      setMapping(createBudgetImportMapping([]));
      setMessage(null);
      return;
    }

    setIsParsing(true);
    setMessage(null);

    try {
      const parsedImport = await parseBudgetImportFile(file);
      setImportData(parsedImport);
      setMapping(createBudgetImportMapping(parsedImport.headers));
    } catch (error) {
      setImportData(null);
      setMapping(createBudgetImportMapping([]));
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to read the selected budget file.",
        tone: "error",
      });
    } finally {
      setIsParsing(false);
    }
  }

  async function handleApplyImport() {
    if (!preview || !canSaveImport) {
      return;
    }

    setIsApplying(true);
    setMessage(null);

    try {
      await onApplyImport(preview.categories);
      setImportData(null);
      setMapping(createBudgetImportMapping([]));
      setMessage({
        body: "Budget baseline imported. Matching categories were updated and unmatched active categories were archived.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to save the imported baseline.",
        tone: "error",
      });
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Import baseline</CardTitle>
            <CardDescription>
              Upload a CSV or XLSX file, confirm the column mapping, then save
              the staged categories into the active budget baseline.
            </CardDescription>
          </div>
          <Badge variant="outline">CSV + XLSX</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label
            className="text-ink block text-sm font-semibold"
            htmlFor="budget-import-file"
          >
            Budget file
          </label>
          <Input
            accept=".csv,.xlsx"
            disabled={disabled || isParsing || isApplying}
            id="budget-import-file"
            onChange={(event) =>
              void handleFileSelection(event.target.files?.[0] ?? null)
            }
            type="file"
          />
          <p className="text-muted text-sm leading-6">
            Required columns: category name, income or expense, fixed or
            variable, and planned amount.
          </p>
        </div>

        {message ? (
          <div
            className={
              message.tone === "error"
                ? "border-warning/30 text-warning rounded-[24px] border bg-orange-50 px-4 py-3 text-sm leading-6"
                : "border-success/20 text-success rounded-[24px] border bg-emerald-50 px-4 py-3 text-sm leading-6"
            }
          >
            {message.body}
          </div>
        ) : null}

        {isParsing ? (
          <div className="border-line/70 bg-panel-strong/35 text-muted rounded-[24px] border px-4 py-3 text-sm leading-6">
            Reading the selected file locally and preparing the staging view.
          </div>
        ) : null}

        {preview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                <p className="text-muted text-sm">Rows detected</p>
                <p className="text-ink mt-1 text-lg font-semibold tracking-tight">
                  {preview.totalRowCount}
                </p>
              </div>
              <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                <p className="text-muted text-sm">Valid rows</p>
                <p className="text-ink mt-1 text-lg font-semibold tracking-tight">
                  {preview.categories.length}
                </p>
              </div>
              <div className="border-line/70 bg-panel-strong/35 rounded-2xl border px-4 py-3">
                <p className="text-muted text-sm">Issues</p>
                <p className="text-ink mt-1 text-lg font-semibold tracking-tight">
                  {preview.errorCount} errors / {preview.warningCount} warnings
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-ink text-base font-semibold tracking-tight">
                  Column mapping
                </h3>
                <p className="text-muted mt-1 text-sm leading-6">
                  The preview updates immediately when you adjust a mapping.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(budgetImportFieldLabels).map(
                  ([fieldKey, label]) => {
                    const field = fieldKey as BudgetImportField;
                    const required = requiredBudgetImportFields.includes(field);

                    return (
                      <div className="space-y-2" key={field}>
                        <label
                          className="text-ink block text-sm font-semibold"
                          htmlFor={`budget-import-mapping-${field}`}
                        >
                          {label}
                          {required ? " *" : ""}
                        </label>
                        <Select
                          disabled={disabled || isApplying}
                          id={`budget-import-mapping-${field}`}
                          onChange={(event) =>
                            setMapping((currentMapping) => ({
                              ...currentMapping,
                              [field]:
                                event.target.value === "__none__"
                                  ? null
                                  : event.target.value,
                            }))
                          }
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

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-ink text-base font-semibold tracking-tight">
                    Staging preview
                  </h3>
                  <p className="text-muted mt-1 text-sm leading-6">
                    Imported rows become the active baseline only after you save
                    them.
                  </p>
                </div>
                <Badge variant={preview.errorCount > 0 ? "warning" : "accent"}>
                  {preview.sourceFormat.toUpperCase()}
                </Badge>
              </div>

              <div className="border-line/80 overflow-hidden rounded-[24px] border">
                <div className="max-h-[28rem] overflow-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-panel-strong/55 text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Row</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold">Kind</th>
                        <th className="px-4 py-3 font-semibold">Mode</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-line/70 bg-panel divide-y">
                      {preview.rows.slice(0, 8).map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="text-muted px-4 py-3 align-top">
                            {row.rowNumber}
                          </td>
                          <td className="text-ink px-4 py-3 align-top">
                            {row.category?.name ?? "Not ready"}
                          </td>
                          <td className="text-muted px-4 py-3 align-top">
                            {row.category?.kind ?? "—"}
                          </td>
                          <td className="text-muted px-4 py-3 align-top">
                            {row.category?.mode ?? "—"}
                          </td>
                          <td className="text-muted px-4 py-3 align-top">
                            {row.category
                              ? formatMinorUnits(row.category.plannedAmount)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-2">
                              <Badge
                                variant={
                                  row.status === "valid" ? "accent" : "warning"
                                }
                              >
                                {row.status === "valid"
                                  ? "Ready"
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {preview.rows.length > 8 ? (
                <p className="text-muted text-sm leading-6">
                  Showing the first 8 staged rows from {preview.fileName}.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!canSaveImport}
                onClick={() => void handleApplyImport()}
                variant="primary"
              >
                {isApplying ? "Saving import..." : "Save imported baseline"}
              </Button>
              <Button
                disabled={isApplying}
                onClick={() => {
                  setImportData(null);
                  setMapping(createBudgetImportMapping([]));
                  setMessage(null);
                }}
                variant="secondary"
              >
                Clear staging
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
