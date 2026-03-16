import {
  getAppDatabase,
  getAppSettings,
  rebuildMonthlySnapshotsForMonths,
  type TwoCentsDatabase,
} from "@/db";
import { normalizeMerchantName } from "@/features/import/lib/merchant-normalization";
import { createIsoTimestamp, toMonthKey } from "@/lib/date";
import { transactionSchema } from "@/types";

import {
  normalizeTransactionFormValues,
  type TransactionFormValues,
} from "@/features/transactions/lib/transaction-form";

function createTransactionId() {
  return `transaction-${crypto.randomUUID()}`;
}

async function assertCategoryStillExists(
  categoryId: string | null,
  db: TwoCentsDatabase,
) {
  if (!categoryId) {
    return;
  }

  const category = await db.budgetCategories.get(categoryId);

  if (!category) {
    throw new Error("The selected category no longer exists.");
  }
}

export async function saveTransaction(
  values: TransactionFormValues,
  options: {
    db?: TwoCentsDatabase;
    transactionId?: string | null;
  } = {},
) {
  const db = options.db ?? getAppDatabase();
  const normalizedValues = normalizeTransactionFormValues(values);
  const [existingTransaction, settings] = await Promise.all([
    options.transactionId ? db.transactions.get(options.transactionId) : null,
    getAppSettings(db),
  ]);

  if (options.transactionId && !existingTransaction) {
    throw new Error("The selected transaction could not be found.");
  }

  await assertCategoryStillExists(normalizedValues.categoryId, db);

  const now = createIsoTimestamp();
  const nextTransaction = transactionSchema.parse({
    amount: normalizedValues.amount,
    categoryId: normalizedValues.categoryId,
    createdAt: existingTransaction?.createdAt ?? now,
    date: normalizedValues.date,
    direction: normalizedValues.direction,
    id: existingTransaction?.id ?? createTransactionId(),
    ignored: normalizedValues.ignored,
    merchantNormalized: normalizeMerchantName(normalizedValues.merchantRaw),
    merchantRaw: normalizedValues.merchantRaw,
    monthKey: toMonthKey(normalizedValues.date, settings?.monthStartDay ?? 1),
    notes: normalizedValues.notes,
    sourceImportId: existingTransaction?.sourceImportId ?? null,
    sourceType: existingTransaction?.sourceType ?? "manual",
    transferLike: normalizedValues.transferLike,
    updatedAt: now,
  });

  return db.transaction(
    "rw",
    [db.transactions, db.monthlySnapshots, db.budgetCategories],
    async () => {
      await db.transactions.put(nextTransaction);
      await rebuildMonthlySnapshotsForMonths(
        [existingTransaction?.monthKey, nextTransaction.monthKey].filter(
          (monthKey): monthKey is string => Boolean(monthKey),
        ),
        now,
        db,
      );

      return nextTransaction;
    },
  );
}

export async function deleteTransaction(
  transactionId: string,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const now = createIsoTimestamp();

  return db.transaction(
    "rw",
    [db.transactions, db.monthlySnapshots, db.budgetCategories],
    async () => {
      const existingTransaction = await db.transactions.get(transactionId);

      if (!existingTransaction) {
        throw new Error("The selected transaction could not be found.");
      }

      await db.transactions.delete(transactionId);
      await rebuildMonthlySnapshotsForMonths(
        [existingTransaction.monthKey],
        now,
        db,
      );

      return existingTransaction;
    },
  );
}

export async function bulkCategorizeTransactions(
  params: {
    categoryId: string;
    transactionIds: string[];
  },
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const uniqueTransactionIds = Array.from(new Set(params.transactionIds));

  if (uniqueTransactionIds.length === 0) {
    return {
      categoryName: null,
      updatedCount: 0,
    };
  }

  const category = await db.budgetCategories.get(params.categoryId);

  if (!category || category.archived) {
    throw new Error("Select an active category before bulk categorizing.");
  }

  const now = createIsoTimestamp();

  return db.transaction(
    "rw",
    [db.transactions, db.monthlySnapshots, db.budgetCategories],
    async () => {
      const existingTransactions = await db.transactions.bulkGet(
        uniqueTransactionIds,
      );
      const updates = existingTransactions.flatMap((transaction) => {
        if (!transaction || transaction.categoryId === category.id) {
          return [];
        }

        return [
          transactionSchema.parse({
            ...transaction,
            categoryId: category.id,
            updatedAt: now,
          }),
        ];
      });

      if (updates.length === 0) {
        return {
          categoryName: category.name,
          updatedCount: 0,
        };
      }

      await db.transactions.bulkPut(updates);
      await rebuildMonthlySnapshotsForMonths(
        updates.map((transaction) => transaction.monthKey),
        now,
        db,
      );

      return {
        categoryName: category.name,
        updatedCount: updates.length,
      };
    },
  );
}
