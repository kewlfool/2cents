import Papa from "papaparse";
import readXlsxFile from "read-excel-file/browser";

import { parseMajorUnitToMinorUnits } from "@/lib/money";
import type { CategoryKind, CategoryMode } from "@/types";

import type { BudgetBaselineDraftCategory } from "@/features/budget/lib/budget-form";

const budgetImportFieldLabels = {
  color: "Color",
  iconKey: "Icon key",
  kind: "Income or expense",
  mode: "Fixed or variable",
  name: "Category name",
  plannedAmount: "Planned amount",
  sortOrder: "Sort order",
} as const;

export type BudgetImportField = keyof typeof budgetImportFieldLabels;

export type BudgetImportMapping = Record<BudgetImportField, string | null>;

export type BudgetImportIssue = {
  field: BudgetImportField | "row";
  message: string;
  rowNumber: number | null;
  severity: "error" | "warning";
};

export type BudgetImportPreviewRow = {
  category: BudgetBaselineDraftCategory | null;
  issues: BudgetImportIssue[];
  raw: Record<string, string>;
  rowNumber: number;
  status: "invalid" | "valid";
};

export type BudgetImportPreview = {
  categories: BudgetBaselineDraftCategory[];
  errorCount: number;
  fileName: string;
  headers: string[];
  issues: BudgetImportIssue[];
  mapping: BudgetImportMapping;
  rows: BudgetImportPreviewRow[];
  sourceFormat: "csv" | "xlsx";
  totalRowCount: number;
  warningCount: number;
};

export type BudgetImportRawData = {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  sourceFormat: "csv" | "xlsx";
};

const requiredBudgetImportFields: BudgetImportField[] = [
  "name",
  "kind",
  "mode",
  "plannedAmount",
];

const autoHeaderMatchers: Record<BudgetImportField, string[]> = {
  color: ["color", "colour"],
  iconKey: ["icon", "icon key", "iconkey"],
  kind: ["kind", "type", "income expense", "direction", "category type"],
  mode: ["mode", "fixed variable", "budget mode", "variability"],
  name: ["category", "name", "category name", "budget category"],
  plannedAmount: ["planned", "planned amount", "budget", "amount", "baseline"],
  sortOrder: ["sort", "order", "sort order", "position"],
};

function normalizeHeaderCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toDisplayCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).trim();
}

function createUniqueHeaders(values: unknown[]) {
  const seenCounts = new Map<string, number>();

  return values.map((value, index) => {
    const baseHeader = toDisplayCellValue(value) || `Column ${index + 1}`;
    const seenCount = seenCounts.get(baseHeader) ?? 0;
    seenCounts.set(baseHeader, seenCount + 1);

    if (seenCount === 0) {
      return baseHeader;
    }

    return `${baseHeader} (${seenCount + 1})`;
  });
}

function mapRowsFromMatrix(
  matrix: unknown[][],
  sourceFormat: "csv" | "xlsx",
  fileName: string,
) {
  if (matrix.length === 0) {
    throw new Error("The selected file does not contain any rows.");
  }

  const [headerRow, ...dataRows] = matrix;

  if (!headerRow || headerRow.length === 0) {
    throw new Error("The selected file is missing a header row.");
  }

  const headers = createUniqueHeaders(headerRow);
  const rows = dataRows.map((row) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = toDisplayCellValue(row[index]);
      return accumulator;
    }, {}),
  );

  return {
    fileName,
    headers,
    rows,
    sourceFormat,
  } satisfies BudgetImportRawData;
}

function parseCsvFile(file: File): Promise<BudgetImportRawData> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(
            new Error(
              results.errors[0]?.message ?? "Unable to parse the CSV file.",
            ),
          );
          return;
        }

        const matrix = results.data.filter((row): row is string[] =>
          Array.isArray(row),
        );

        resolve(mapRowsFromMatrix(matrix, "csv", file.name));
      },
      skipEmptyLines: false,
    });
  });
}

async function parseXlsxFile(file: File) {
  const matrix = await readXlsxFile(file);

  return mapRowsFromMatrix(matrix as unknown[][], "xlsx", file.name);
}

export async function parseBudgetImportFile(file: File) {
  const lowerFileName = file.name.toLowerCase();

  if (lowerFileName.endsWith(".csv")) {
    return parseCsvFile(file);
  }

  if (lowerFileName.endsWith(".xlsx")) {
    return parseXlsxFile(file);
  }

  throw new Error("Budget imports currently support CSV and XLSX files only.");
}

export function createBudgetImportMapping(
  headers: string[],
): BudgetImportMapping {
  const remainingHeaders = [...headers];

  return Object.keys(budgetImportFieldLabels).reduce<BudgetImportMapping>(
    (accumulator, fieldKey) => {
      const field = fieldKey as BudgetImportField;
      const matchedHeader = remainingHeaders.find((header) => {
        const normalizedHeader = normalizeHeaderCandidate(header);

        return autoHeaderMatchers[field].some(
          (candidate) =>
            normalizedHeader === candidate ||
            normalizedHeader.includes(candidate),
        );
      });

      accumulator[field] = matchedHeader ?? null;

      if (matchedHeader) {
        remainingHeaders.splice(remainingHeaders.indexOf(matchedHeader), 1);
      }

      return accumulator;
    },
    {
      color: null,
      iconKey: null,
      kind: null,
      mode: null,
      name: null,
      plannedAmount: null,
      sortOrder: null,
    },
  );
}

function normalizeKind(value: string): CategoryKind | null {
  const normalizedValue = normalizeHeaderCandidate(value);

  if (
    ["income", "earning", "earnings", "salary", "pay", "revenue"].includes(
      normalizedValue,
    )
  ) {
    return "income";
  }

  if (
    [
      "expense",
      "expenses",
      "spend",
      "spending",
      "cost",
      "bill",
      "bills",
    ].includes(normalizedValue)
  ) {
    return "expense";
  }

  return null;
}

function normalizeMode(value: string): CategoryMode | null {
  const normalizedValue = normalizeHeaderCandidate(value);

  if (["fixed", "recurring", "monthly fixed"].includes(normalizedValue)) {
    return "fixed";
  }

  if (
    ["variable", "flex", "discretionary", "monthly variable"].includes(
      normalizedValue,
    )
  ) {
    return "variable";
  }

  return null;
}

function normalizeCategoryKey(category: BudgetBaselineDraftCategory) {
  return `${category.kind}:${category.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

export function buildBudgetImportPreview(
  source: BudgetImportRawData,
  mapping: BudgetImportMapping,
): BudgetImportPreview {
  const issues: BudgetImportIssue[] = [];
  const seenKeys = new Set<string>();

  for (const field of requiredBudgetImportFields) {
    if (!mapping[field]) {
      issues.push({
        field,
        message: `${budgetImportFieldLabels[field]} must be mapped before the import can be saved.`,
        rowNumber: null,
        severity: "error",
      });
    }
  }

  const rows = source.rows.map<BudgetImportPreviewRow>((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const rowIssues: BudgetImportIssue[] = [];

    const mappedName = mapping.name ? (row[mapping.name] ?? "") : "";
    const mappedKind = mapping.kind ? (row[mapping.kind] ?? "") : "";
    const mappedMode = mapping.mode ? (row[mapping.mode] ?? "") : "";
    const mappedAmount = mapping.plannedAmount
      ? (row[mapping.plannedAmount] ?? "")
      : "";

    const rowValues = [mappedName, mappedKind, mappedMode, mappedAmount].map(
      (value) => value.trim(),
    );
    const isBlankRow = rowValues.every((value) => value.length === 0);

    if (isBlankRow) {
      const blankRowIssue = {
        field: "row",
        message: "Blank row skipped.",
        rowNumber,
        severity: "warning",
      } satisfies BudgetImportIssue;

      issues.push(blankRowIssue);

      return {
        category: null,
        issues: [blankRowIssue],
        raw: row,
        rowNumber,
        status: "invalid",
      };
    }

    const normalizedKind = normalizeKind(mappedKind);
    const normalizedMode = normalizeMode(mappedMode);
    const parsedAmount = parseMajorUnitToMinorUnits(mappedAmount);

    if (!mappedName.trim()) {
      rowIssues.push({
        field: "name",
        message: "Category name is required.",
        rowNumber,
        severity: "error",
      });
    }

    if (!normalizedKind) {
      rowIssues.push({
        field: "kind",
        message: `Could not interpret "${mappedKind}" as income or expense.`,
        rowNumber,
        severity: "error",
      });
    }

    if (!normalizedMode) {
      rowIssues.push({
        field: "mode",
        message: `Could not interpret "${mappedMode}" as fixed or variable.`,
        rowNumber,
        severity: "error",
      });
    }

    if (parsedAmount === null) {
      rowIssues.push({
        field: "plannedAmount",
        message: `Could not parse "${mappedAmount}" as a budget amount.`,
        rowNumber,
        severity: "error",
      });
    }

    const normalizedAmount =
      parsedAmount === null ? null : Math.abs(parsedAmount);

    if (parsedAmount !== null && parsedAmount < 0) {
      rowIssues.push({
        field: "plannedAmount",
        message: "Negative amount normalized to its absolute value.",
        rowNumber,
        severity: "warning",
      });
    }

    const category =
      mappedName.trim() &&
      normalizedKind &&
      normalizedMode &&
      normalizedAmount !== null
        ? {
            color: mapping.color ? row[mapping.color]?.trim() || null : null,
            iconKey: mapping.iconKey
              ? row[mapping.iconKey]?.trim() || null
              : null,
            id: null,
            kind: normalizedKind,
            mode: normalizedMode,
            name: mappedName.trim(),
            plannedAmount: normalizedAmount,
          }
        : null;

    if (category) {
      const categoryKey = normalizeCategoryKey(category);

      if (seenKeys.has(categoryKey)) {
        rowIssues.push({
          field: "row",
          message:
            "Duplicate category rows are not supported. Keep one row per category and kind.",
          rowNumber,
          severity: "error",
        });
      } else {
        seenKeys.add(categoryKey);
      }
    }

    issues.push(...rowIssues);

    return {
      category: rowIssues.some((issue) => issue.severity === "error")
        ? null
        : category,
      issues: rowIssues,
      raw: row,
      rowNumber,
      status: rowIssues.some((issue) => issue.severity === "error")
        ? "invalid"
        : "valid",
    };
  });

  const categories = rows.flatMap((row) =>
    row.category ? [row.category] : [],
  );
  const errorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  return {
    categories,
    errorCount,
    fileName: source.fileName,
    headers: source.headers,
    issues,
    mapping,
    rows,
    sourceFormat: source.sourceFormat,
    totalRowCount: source.rows.length,
    warningCount,
  };
}

export { budgetImportFieldLabels, requiredBudgetImportFields };
