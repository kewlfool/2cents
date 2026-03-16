import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAppDatabase,
  ensureAppDataReady,
  type TwoCentsDatabase,
} from "@/db";
import {
  buildStatementImportPreview,
  createStatementImportMapping,
} from "@/features/import/lib/statement-import";
import {
  commitStatementImport,
  deleteStatementImportRecord,
  rollbackStatementImport,
} from "@/features/import/lib/statement-import-service";

describe("statement import persistence", () => {
  let db: TwoCentsDatabase;

  beforeEach(() => {
    db = createAppDatabase(`test-import-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("commits, rolls back, and deletes a staged statement import record", async () => {
    await ensureAppDataReady(db);

    const [categories, rules, imports, transactions] = await Promise.all([
      db.budgetCategories.toArray(),
      db.merchantRules.toArray(),
      db.statementImports.toArray(),
      db.transactions.toArray(),
    ]);
    const marchSnapshotBefore = await db.monthlySnapshots.get("2026-03");

    const preview = buildStatementImportPreview({
      categories,
      existingImports: imports,
      existingTransactions: transactions,
      mapping: createStatementImportMapping(["Date", "Merchant", "Amount"]),
      rules,
      source: {
        checksum: "stmt-commit-test",
        fileName: "march-statement.csv",
        headers: ["Date", "Merchant", "Amount"],
        rows: [
          {
            Amount: "23.45",
            Date: "03/28/2026",
            Merchant: "Corner Market",
          },
        ],
        sourceFormat: "csv",
      },
    });

    const result = await commitStatementImport({ db, preview });
    const storedImport = await db.statementImports.get(result.statementImport.id);
    const storedTransactions = await db.transactions
      .where("sourceImportId")
      .equals(result.statementImport.id)
      .toArray();
    const marchSnapshotAfterCommit = await db.monthlySnapshots.get("2026-03");

    expect(storedImport?.status).toBe("committed");
    expect(storedTransactions).toHaveLength(1);
    expect(marchSnapshotAfterCommit?.actualExpenses).toBe(
      (marchSnapshotBefore?.actualExpenses ?? 0) + 2_345,
    );

    await rollbackStatementImport(result.statementImport.id, db);

    const rolledBackImport = await db.statementImports.get(result.statementImport.id);
    const storedTransactionsAfterRollback = await db.transactions
      .where("sourceImportId")
      .equals(result.statementImport.id)
      .toArray();
    const marchSnapshotAfterRollback = await db.monthlySnapshots.get("2026-03");

    expect(rolledBackImport?.status).toBe("rolled_back");
    expect(storedTransactionsAfterRollback).toHaveLength(0);
    expect(marchSnapshotAfterRollback?.actualExpenses).toBe(
      marchSnapshotBefore?.actualExpenses,
    );

    await deleteStatementImportRecord(result.statementImport.id, db);

    expect(await db.statementImports.get(result.statementImport.id)).toBeUndefined();
  });
});
