import {
  getAppDatabase,
  rebuildMonthlySnapshotsForMonths,
  type TwoCentsDatabase,
} from "@/db";
import { createIsoTimestamp } from "@/lib/date";
import {
  statementImportSchema,
  transactionSchema,
  type ImportWarning,
  type StatementImport,
  type Transaction,
} from "@/types";

import type { StatementImportPreview } from "@/features/import/lib/statement-import";

type CommitStatementImportParams = {
  categoryOverrides?: Record<number, string | null>;
  db?: TwoCentsDatabase;
  preview: StatementImportPreview;
};

function createStoredImportWarnings(preview: StatementImportPreview) {
  return preview.rows.flatMap((row) =>
    row.issues
      .filter((issue) => issue.rowNumber !== null)
      .map(
        (issue) =>
          ({
            column: issue.field === "row" ? null : issue.field,
            message: issue.message,
            rowNumber: issue.rowNumber as number,
            severity: issue.severity,
          }) satisfies ImportWarning,
      ),
  );
}

function createStoredColumnMap(preview: StatementImportPreview) {
  return Object.fromEntries(
    Object.entries(preview.mapping).flatMap(([field, header]) =>
      header ? [[field, header]] : [],
    ),
  );
}

function createImportId() {
  return `statement-import-${crypto.randomUUID()}`;
}

function createTransactionId() {
  return `transaction-${crypto.randomUUID()}`;
}

export async function commitStatementImport({
  categoryOverrides = {},
  db = getAppDatabase(),
  preview,
}: CommitStatementImportParams) {
  if (preview.blockingErrorCount > 0) {
    throw new Error(
      "Resolve the blocking mapping issues before saving this import.",
    );
  }

  const readyRows = preview.rows.filter(
    (row) => row.status === "ready" && row.transaction,
  );

  if (readyRows.length === 0) {
    throw new Error("No ready rows are available to import.");
  }

  if (!preview.primaryMonthKey) {
    throw new Error("Unable to determine the primary month for this import.");
  }

  const importId = createImportId();
  const now = createIsoTimestamp();
  const warnings = createStoredImportWarnings(preview);

  const transactions = readyRows.map((row) => {
    const transaction = row.transaction;

    if (!transaction) {
      throw new Error("Ready import rows must contain a staged transaction.");
    }

    return transactionSchema.parse({
      amount: transaction.amount,
      categoryId: categoryOverrides[row.rowNumber] ?? transaction.categoryId,
      createdAt: now,
      date: transaction.date,
      direction: transaction.direction,
      id: createTransactionId(),
      ignored: false,
      merchantNormalized: transaction.merchantNormalized,
      merchantRaw: transaction.merchantRaw,
      monthKey: transaction.monthKey,
      notes: transaction.notes,
      sourceImportId: importId,
      sourceType: "statement_import",
      transferLike: transaction.transferLike,
      updatedAt: now,
    });
  });

  const statementImport = statementImportSchema.parse({
    checksum: preview.checksum,
    columnMap: createStoredColumnMap(preview),
    duplicateRowCount: preview.duplicateRowCount,
    fileName: preview.fileName,
    id: importId,
    importedAt: now,
    importedRowCount: transactions.length,
    monthKey: preview.primaryMonthKey,
    sourceFormat: preview.sourceFormat,
    status: "committed",
    totalRowCount: preview.totalRowCount,
    warningCount: warnings.filter((warning) => warning.severity === "warning")
      .length,
    warnings,
  });

  await db.transaction(
    "rw",
    [db.statementImports, db.transactions, db.monthlySnapshots, db.budgetCategories],
    async () => {
      await db.statementImports.put(statementImport);

      if (transactions.length > 0) {
        await db.transactions.bulkPut(transactions);
      }

      await rebuildMonthlySnapshotsForMonths(
        transactions.map((transaction) => transaction.monthKey),
        now,
        db,
      );
    },
  );

  return {
    statementImport,
    transactions,
  } satisfies {
    statementImport: StatementImport;
    transactions: Transaction[];
  };
}

export async function rollbackStatementImport(
  importId: string,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const now = createIsoTimestamp();

  return db.transaction(
    "rw",
    [db.statementImports, db.transactions, db.monthlySnapshots, db.budgetCategories],
    async () => {
      const existingImport = await db.statementImports.get(importId);

      if (!existingImport) {
        throw new Error("The selected import could not be found.");
      }

      if (existingImport.status !== "committed") {
        throw new Error("Only committed imports can be rolled back.");
      }

      const importedTransactions = await db.transactions
        .where("sourceImportId")
        .equals(importId)
        .toArray();
      const affectedMonthKeys = Array.from(
        new Set([
          existingImport.monthKey,
          ...importedTransactions.map((transaction) => transaction.monthKey),
        ]),
      );

      await db.transactions.where("sourceImportId").equals(importId).delete();
      await db.statementImports.put(
        statementImportSchema.parse({
          ...existingImport,
          status: "rolled_back",
        }),
      );

      await rebuildMonthlySnapshotsForMonths(affectedMonthKeys, now, db);
    },
  );
}

export async function deleteStatementImportRecord(
  importId: string,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  return db.transaction("rw", [db.statementImports, db.transactions], async () => {
    const existingImport = await db.statementImports.get(importId);

    if (!existingImport) {
      throw new Error("The selected import could not be found.");
    }

    if (existingImport.sourceFormat === "seed") {
      throw new Error("Demo imports cannot be deleted.");
    }

    if (existingImport.status === "committed") {
      throw new Error("Roll back committed imports before deleting the record.");
    }

    const linkedTransactionCount = await db.transactions
      .where("sourceImportId")
      .equals(importId)
      .count();

    if (linkedTransactionCount > 0) {
      throw new Error("Remove imported transactions before deleting the record.");
    }

    await db.statementImports.delete(importId);
  });
}
