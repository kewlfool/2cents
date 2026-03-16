import Papa from "papaparse";
import readXlsxFile from "read-excel-file/browser";

import { toMonthKey } from "@/lib/date";
import { parseMajorUnitToMinorUnits } from "@/lib/money";
import type {
  BudgetCategory,
  ImportWarningSeverity,
  MerchantRule,
  StatementImport,
  Transaction,
  TransactionDirection,
} from "@/types";

import {
  looksLikeTransferMerchant,
  normalizeMerchantName,
} from "@/features/import/lib/merchant-normalization";
import { findMatchingMerchantRule } from "@/features/rules/lib/rule-matching";

export const statementImportFieldLabels = {
  amount: "Amount",
  credit: "Credit or refund",
  date: "Date",
  debit: "Debit or charge",
  direction: "Direction",
  merchant: "Merchant",
  notes: "Notes",
} as const;

export type StatementImportField = keyof typeof statementImportFieldLabels;

export type StatementImportMapping = Record<StatementImportField, string | null>;

export type StatementImportIssue = {
  field: StatementImportField | "row";
  message: string;
  rowNumber: number | null;
  severity: ImportWarningSeverity;
};

export type StatementImportRawData = {
  checksum: string;
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  sourceFormat: "csv" | "xlsx";
};

export type StagedStatementTransaction = {
  amount: number;
  categoryId: string | null;
  date: string;
  direction: TransactionDirection;
  fingerprint: string;
  matchedRuleId: string | null;
  matchedRuleLabel: string | null;
  merchantNormalized: string;
  merchantRaw: string;
  monthKey: string;
  notes: string | null;
  transferLike: boolean;
};

export type StatementImportPreviewRow = {
  duplicateFingerprint: string | null;
  duplicateReason: "existing" | "within_import" | null;
  issues: StatementImportIssue[];
  raw: Record<string, string>;
  rowNumber: number;
  status: "duplicate" | "invalid" | "ready";
  transaction: StagedStatementTransaction | null;
};

export type StatementImportPreview = {
  blockingErrorCount: number;
  categories: BudgetCategory[];
  checksum: string;
  duplicateImportId: string | null;
  duplicateImportWarning: string | null;
  duplicateRowCount: number;
  errorCount: number;
  fileName: string;
  headers: string[];
  invalidRowCount: number;
  issues: StatementImportIssue[];
  mapping: StatementImportMapping;
  monthKeys: string[];
  primaryMonthKey: string | null;
  readyRowCount: number;
  rows: StatementImportPreviewRow[];
  sourceFormat: "csv" | "xlsx";
  totalRowCount: number;
  uncategorizedRowCount: number;
  warningCount: number;
};

type BuildStatementImportPreviewParams = {
  categories: BudgetCategory[];
  existingImports: StatementImport[];
  existingTransactions: Transaction[];
  mapping: StatementImportMapping;
  monthStartDay?: number;
  rules: MerchantRule[];
  source: StatementImportRawData;
};

const autoHeaderMatchers: Record<StatementImportField, string[]> = {
  amount: [
    "amount",
    "transaction amount",
    "total",
    "total amount",
    "cad",
    "cad amount",
    "usd",
    "usd amount",
  ],
  credit: ["credit", "refund", "payment", "deposit"],
  date: ["date", "transaction date", "posted date", "post date"],
  debit: ["debit", "charge", "purchase", "withdrawal"],
  direction: ["direction", "type", "transaction type"],
  merchant: ["merchant", "description", "details", "payee", "vendor"],
  notes: ["memo", "notes", "note", "description 2", "description"],
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
    return formatDateParts(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
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

function formatDateParts(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
}

function createUtcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function normalizeStatementDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    return createUtcDate(year, month, day)
      ? formatDateParts(year, month, day)
      : null;
  }

  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);

  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    const rawYear = Number(usMatch[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;

    return createUtcDate(year, month, day)
      ? formatDateParts(year, month, day)
      : null;
  }

  const namedDate = new Date(trimmed);

  if (!Number.isNaN(namedDate.getTime())) {
    return formatDateParts(
      namedDate.getUTCFullYear(),
      namedDate.getUTCMonth() + 1,
      namedDate.getUTCDate(),
    );
  }

  return null;
}

export function normalizeStatementDirection(value: string): TransactionDirection | null {
  const normalized = normalizeHeaderCandidate(value);

  if (
    [
      "debit",
      "expense",
      "charge",
      "purchase",
      "withdrawal",
      "payment due",
    ].includes(normalized)
  ) {
    return "expense";
  }

  if (
    [
      "credit",
      "income",
      "refund",
      "return",
      "payment",
      "deposit",
      "adjustment",
    ].includes(normalized)
  ) {
    return "income";
  }

  return null;
}

export function createStatementFingerprint(input: {
  amount: number;
  date: string;
  direction: TransactionDirection;
  merchantNormalized: string;
}) {
  return [
    input.date,
    input.direction,
    String(input.amount),
    input.merchantNormalized,
  ].join("|");
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

  const checksum = createImportChecksum({
    fileName,
    headers,
    rows,
    sourceFormat,
  });

  return {
    checksum,
    fileName,
    headers,
    rows,
    sourceFormat,
  } satisfies StatementImportRawData;
}

function createImportChecksum(source: {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  sourceFormat: "csv" | "xlsx";
}) {
  const serialized = JSON.stringify([
    source.sourceFormat,
    source.fileName,
    source.headers,
    source.rows,
  ]);

  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `stmt-${Math.abs(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function parseCsvFile(file: File): Promise<StatementImportRawData> {
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

function getMappedCell(
  row: Record<string, string>,
  mapping: StatementImportMapping,
  field: StatementImportField,
) {
  const header = mapping[field];

  if (!header) {
    return "";
  }

  return row[header] ?? "";
}

function resolveAmountAndDirection(
  row: Record<string, string>,
  mapping: StatementImportMapping,
  rowIssues: StatementImportIssue[],
  rowNumber: number,
) {
  const rawDebit = getMappedCell(row, mapping, "debit");
  const rawCredit = getMappedCell(row, mapping, "credit");
  const rawAmount = getMappedCell(row, mapping, "amount");
  const rawDirection = getMappedCell(row, mapping, "direction");

  const parsedDebit = rawDebit.trim()
    ? parseMajorUnitToMinorUnits(rawDebit)
    : null;
  const parsedCredit = rawCredit.trim()
    ? parseMajorUnitToMinorUnits(rawCredit)
    : null;

  if (rawDebit.trim() && parsedDebit === null) {
    rowIssues.push({
      field: "debit",
      message: `Could not parse "${rawDebit}" as a debit amount.`,
      rowNumber,
      severity: "error",
    });
  }

  if (rawCredit.trim() && parsedCredit === null) {
    rowIssues.push({
      field: "credit",
      message: `Could not parse "${rawCredit}" as a credit amount.`,
      rowNumber,
      severity: "error",
    });
  }

  if (parsedDebit !== null && parsedCredit !== null) {
    rowIssues.push({
      field: "row",
      message:
        "Rows cannot contain both debit and credit values at the same time.",
      rowNumber,
      severity: "error",
    });

    return null;
  }

  if (parsedDebit !== null) {
    return {
      amount: Math.abs(parsedDebit),
      direction: "expense" as const,
    };
  }

  if (parsedCredit !== null) {
    return {
      amount: Math.abs(parsedCredit),
      direction: "income" as const,
    };
  }

  if (!mapping.amount) {
    rowIssues.push({
      field: "amount",
      message:
        "Map either a single amount column or separate debit and credit columns.",
      rowNumber,
      severity: "error",
    });
    return null;
  }

  const parsedAmount = parseMajorUnitToMinorUnits(rawAmount);

  if (parsedAmount === null) {
    rowIssues.push({
      field: "amount",
      message: `Could not parse "${rawAmount}" as an amount.`,
      rowNumber,
      severity: "error",
    });
    return null;
  }

  const mappedDirection = rawDirection.trim()
    ? normalizeStatementDirection(rawDirection)
    : null;

  if (rawDirection.trim() && !mappedDirection) {
    rowIssues.push({
      field: "direction",
      message: `Could not interpret "${rawDirection}" as debit or credit.`,
      rowNumber,
      severity: "error",
    });
    return null;
  }

  return {
    amount: Math.abs(parsedAmount),
    direction:
      mappedDirection ??
      (parsedAmount < 0 ? ("income" as const) : ("expense" as const)),
  };
}

export async function parseStatementImportFile(file: File) {
  const lowerFileName = file.name.toLowerCase();

  if (lowerFileName.endsWith(".csv")) {
    return parseCsvFile(file);
  }

  if (lowerFileName.endsWith(".xlsx")) {
    return parseXlsxFile(file);
  }

  throw new Error(
    "Statement imports currently support CSV and XLSX files only.",
  );
}

export function createStatementImportMapping(
  headers: string[],
): StatementImportMapping {
  const remainingHeaders = [...headers];

  return Object.keys(statementImportFieldLabels).reduce<StatementImportMapping>(
    (accumulator, fieldKey) => {
      const field = fieldKey as StatementImportField;
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
      amount: null,
      credit: null,
      date: null,
      debit: null,
      direction: null,
      merchant: null,
      notes: null,
    },
  );
}

function pickPrimaryMonthKey(monthKeys: string[]) {
  if (monthKeys.length === 0) {
    return null;
  }

  const counts = monthKeys.reduce<Map<string, number>>((accumulator, monthKey) => {
    accumulator.set(monthKey, (accumulator.get(monthKey) ?? 0) + 1);
    return accumulator;
  }, new Map());

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return right[0].localeCompare(left[0]);
  })[0]?.[0] ?? null;
}

function createCategoryMap(categories: BudgetCategory[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

export function buildStatementImportPreview({
  categories,
  existingImports,
  existingTransactions,
  mapping,
  monthStartDay = 1,
  rules,
  source,
}: BuildStatementImportPreviewParams): StatementImportPreview {
  const issues: StatementImportIssue[] = [];
  const activeCategories = categories.filter((category) => !category.archived);
  const categoryMap = createCategoryMap(activeCategories);

  if (!mapping.date) {
    issues.push({
      field: "date",
      message: "Date must be mapped before this import can be saved.",
      rowNumber: null,
      severity: "error",
    });
  }

  if (!mapping.merchant) {
    issues.push({
      field: "merchant",
      message: "Merchant must be mapped before this import can be saved.",
      rowNumber: null,
      severity: "error",
    });
  }

  if (!mapping.amount && !(mapping.debit || mapping.credit)) {
    issues.push({
      field: "amount",
      message:
        "Map a single amount column, or map debit and/or credit columns before saving.",
      rowNumber: null,
      severity: "error",
    });
  }

  const duplicateImport = existingImports.find(
    (statementImport) =>
      statementImport.checksum === source.checksum &&
      statementImport.status !== "rolled_back",
  );

  if (duplicateImport) {
    issues.push({
      field: "row",
      message:
        "This file matches a previously imported statement and is blocked to avoid a duplicate import.",
      rowNumber: null,
      severity: "error",
    });
  }

  const existingFingerprints = new Set(
    existingTransactions.map((transaction) =>
      createStatementFingerprint({
        amount: transaction.amount,
        date: transaction.date,
        direction: transaction.direction,
        merchantNormalized: transaction.merchantNormalized,
      }),
    ),
  );
  const stagedFingerprints = new Set<string>();

  const rows = source.rows.map<StatementImportPreviewRow>((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const rowIssues: StatementImportIssue[] = [];

    const mappedDate = getMappedCell(row, mapping, "date");
    const mappedMerchant = getMappedCell(row, mapping, "merchant");
    const mappedAmount = getMappedCell(row, mapping, "amount");
    const mappedDebit = getMappedCell(row, mapping, "debit");
    const mappedCredit = getMappedCell(row, mapping, "credit");

    const isBlankRow = [
      mappedDate,
      mappedMerchant,
      mappedAmount,
      mappedDebit,
      mappedCredit,
    ].every((value) => value.trim().length === 0);

    if (isBlankRow) {
      const blankRowIssue = {
        field: "row",
        message: "Blank row skipped.",
        rowNumber,
        severity: "warning",
      } satisfies StatementImportIssue;

      issues.push(blankRowIssue);

      return {
        duplicateFingerprint: null,
        duplicateReason: null,
        issues: [blankRowIssue],
        raw: row,
        rowNumber,
        status: "invalid",
        transaction: null,
      };
    }

    const normalizedDate = normalizeStatementDate(mappedDate);

    if (!normalizedDate) {
      rowIssues.push({
        field: "date",
        message: `Could not interpret "${mappedDate}" as a valid date.`,
        rowNumber,
        severity: "error",
      });
    }

    if (!mappedMerchant.trim()) {
      rowIssues.push({
        field: "merchant",
        message: "Merchant is required.",
        rowNumber,
        severity: "error",
      });
    }

    const amountAndDirection = resolveAmountAndDirection(
      row,
      mapping,
      rowIssues,
      rowNumber,
    );
    const merchantRaw = mappedMerchant.trim();
    const merchantNormalized = normalizeMerchantName(merchantRaw);
    const matchedRule = findMatchingMerchantRule(merchantNormalized, rules);
    const matchedCategory = matchedRule
      ? categoryMap.get(matchedRule.categoryId) ?? null
      : null;

    if (matchedRule && !matchedCategory) {
      rowIssues.push({
        field: "row",
        message:
          "A merchant rule matched this row, but the category is no longer active.",
        rowNumber,
        severity: "warning",
      });
    }

    const transferLike = looksLikeTransferMerchant(merchantNormalized);

    if (transferLike) {
      rowIssues.push({
        field: "row",
        message:
          "This looks like a transfer or payment row. Review it before importing.",
        rowNumber,
        severity: "warning",
      });
    }

    const transaction =
      normalizedDate && amountAndDirection && merchantRaw
        ? {
            amount: amountAndDirection.amount,
            categoryId:
              matchedCategory?.kind === amountAndDirection.direction
                ? matchedCategory.id
                : null,
            date: normalizedDate,
            direction: amountAndDirection.direction,
            fingerprint: createStatementFingerprint({
              amount: amountAndDirection.amount,
              date: normalizedDate,
              direction: amountAndDirection.direction,
              merchantNormalized,
            }),
            matchedRuleId: matchedRule?.id ?? null,
            matchedRuleLabel: matchedRule
              ? `${matchedRule.matchType} "${matchedRule.pattern}"`
              : null,
            merchantNormalized,
            merchantRaw,
            monthKey: toMonthKey(normalizedDate, monthStartDay),
            notes: getMappedCell(row, mapping, "notes").trim() || null,
            transferLike,
          }
        : null;

    let duplicateReason: StatementImportPreviewRow["duplicateReason"] = null;

    if (transaction) {
      if (existingFingerprints.has(transaction.fingerprint)) {
        duplicateReason = "existing";
        rowIssues.push({
          field: "row",
          message:
            "This row matches an existing transaction and will be skipped as a duplicate.",
          rowNumber,
          severity: "warning",
        });
      } else if (stagedFingerprints.has(transaction.fingerprint)) {
        duplicateReason = "within_import";
        rowIssues.push({
          field: "row",
          message:
            "This row duplicates another row in the same file and will be skipped.",
          rowNumber,
          severity: "warning",
        });
      } else {
        stagedFingerprints.add(transaction.fingerprint);
      }
    }

    issues.push(...rowIssues);

    return {
      duplicateFingerprint: transaction?.fingerprint ?? null,
      duplicateReason,
      issues: rowIssues,
      raw: row,
      rowNumber,
      status: rowIssues.some((issue) => issue.severity === "error")
        ? "invalid"
        : duplicateReason
          ? "duplicate"
          : "ready",
      transaction:
        rowIssues.some((issue) => issue.severity === "error") || !transaction
          ? null
          : transaction,
    };
  });

  const blockingErrorCount = issues.filter(
    (issue) => issue.rowNumber === null && issue.severity === "error",
  ).length;
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  const readyRows = rows.filter((row) => row.status === "ready");
  const duplicateRows = rows.filter((row) => row.status === "duplicate");
  const invalidRows = rows.filter((row) => row.status === "invalid");
  const uncategorizedRowCount = readyRows.filter(
    (row) => !row.transaction?.categoryId,
  ).length;
  const monthKeys = readyRows
    .flatMap((row) => (row.transaction ? [row.transaction.monthKey] : []))
    .sort();

  return {
    blockingErrorCount,
    categories: activeCategories,
    checksum: source.checksum,
    duplicateImportId: duplicateImport?.id ?? null,
    duplicateImportWarning: duplicateImport
      ? `Matching import already exists for ${duplicateImport.fileName}.`
      : null,
    duplicateRowCount: duplicateRows.length,
    errorCount,
    fileName: source.fileName,
    headers: source.headers,
    invalidRowCount: invalidRows.length,
    issues,
    mapping,
    monthKeys: Array.from(new Set(monthKeys)),
    primaryMonthKey: pickPrimaryMonthKey(monthKeys),
    readyRowCount: readyRows.length,
    rows,
    sourceFormat: source.sourceFormat,
    totalRowCount: source.rows.length,
    uncategorizedRowCount,
    warningCount,
  };
}
