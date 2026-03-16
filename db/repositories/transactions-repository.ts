import {
  statementImportSchema,
  transactionSchema,
  type StatementImport,
  type Transaction,
} from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";

export async function countTransactions(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  return db.transactions.count();
}

export async function listTransactionsForMonth(
  monthKey: string,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const transactions = await db.transactions
    .where("monthKey")
    .equals(monthKey)
    .toArray();
  return transactions.map((transaction) =>
    transactionSchema.parse(transaction),
  );
}

export async function listTransactions(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const transactions = await db.transactions.orderBy("date").reverse().toArray();

  return transactions.map((transaction) =>
    transactionSchema.parse(transaction),
  );
}

export async function bulkPutTransactions(
  transactions: Transaction[],
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedTransactions = transactions.map((transaction) =>
    transactionSchema.parse(transaction),
  );
  await db.transactions.bulkPut(parsedTransactions);
  return parsedTransactions;
}

export async function countStatementImports(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  return db.statementImports.count();
}

export async function listStatementImports(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const statementImports = await db.statementImports
    .orderBy("importedAt")
    .reverse()
    .toArray();

  return statementImports.map((statementImport) =>
    statementImportSchema.parse(statementImport),
  );
}

export async function bulkPutStatementImports(
  statementImports: StatementImport[],
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedImports = statementImports.map((statementImport) =>
    statementImportSchema.parse(statementImport),
  );
  await db.statementImports.bulkPut(parsedImports);
  return parsedImports;
}
