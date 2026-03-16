import {
  getAppDatabase,
  rebuildMonthlySnapshotsForMonths,
  type TwoCentsDatabase,
} from "@/db";
import { createIsoTimestamp } from "@/lib/date";
import { merchantRuleSchema, transactionSchema, type MerchantRule } from "@/types";

import type { StagedStatementTransaction } from "@/features/import/lib/statement-import";
import { previewMerchantRuleApplications } from "@/features/rules/lib/rule-application";
import {
  merchantRuleFormSchema,
  type MerchantRuleFormValues,
} from "@/features/rules/lib/rule-form";

function createMerchantRuleId() {
  return `merchant-rule-${crypto.randomUUID()}`;
}

function getNextRulePriority(rules: MerchantRule[]) {
  const highestPriority = rules.reduce(
    (highest, rule) => Math.max(highest, rule.priority),
    90,
  );

  return highestPriority + 10;
}

export async function saveMerchantRule(
  values: MerchantRuleFormValues,
  options: {
    db?: TwoCentsDatabase;
    ruleId?: string | null;
  } = {},
) {
  const db = options.db ?? getAppDatabase();
  const parsedValues = merchantRuleFormSchema.parse(values);
  const now = createIsoTimestamp();
  const existingRule = options.ruleId
    ? await db.merchantRules.get(options.ruleId)
    : null;

  const nextRule = merchantRuleSchema.parse({
    categoryId: parsedValues.categoryId,
    createdAt: existingRule?.createdAt ?? now,
    id: existingRule?.id ?? createMerchantRuleId(),
    isCaseSensitive: parsedValues.isCaseSensitive,
    matchType: parsedValues.matchType,
    pattern: parsedValues.pattern.trim(),
    priority: parsedValues.priority,
    updatedAt: now,
  });

  await db.merchantRules.put(nextRule);

  return nextRule;
}

export async function deleteMerchantRule(
  ruleId: string,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  await db.merchantRules.delete(ruleId);
}

export async function saveMerchantRuleFromCorrection(
  params: {
    categoryId: string;
    transaction: StagedStatementTransaction;
  },
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const now = createIsoTimestamp();
  const rules = await db.merchantRules.toArray();
  const nextPriority = getNextRulePriority(rules);
  const existingExactRule = rules.find(
    (rule) =>
      rule.matchType === "exact" &&
      !rule.isCaseSensitive &&
      rule.pattern.toUpperCase() === params.transaction.merchantNormalized,
  );

  const nextRule = merchantRuleSchema.parse({
    categoryId: params.categoryId,
    createdAt: existingExactRule?.createdAt ?? now,
    id: existingExactRule?.id ?? createMerchantRuleId(),
    isCaseSensitive: false,
    matchType: "exact",
    pattern: params.transaction.merchantNormalized,
    priority: Math.max(existingExactRule?.priority ?? 0, nextPriority),
    updatedAt: now,
  });

  await db.merchantRules.put(nextRule);

  return {
    action: existingExactRule ? "updated" : "created",
    rule: nextRule,
  } as const;
}

export async function applyMerchantRulePreview(
  previewRows: ReturnType<typeof previewMerchantRuleApplications>,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  if (previewRows.length === 0) {
    return {
      updatedCount: 0,
    };
  }

  const previewByTransactionId = new Map(
    previewRows.map((row) => [row.transactionId, row]),
  );
  const now = createIsoTimestamp();

  return db.transaction(
    "rw",
    [db.transactions, db.monthlySnapshots, db.budgetCategories],
    async () => {
      const existingTransactions = await db.transactions.bulkGet(
        previewRows.map((row) => row.transactionId),
      );
      const updates = existingTransactions.flatMap((transaction) => {
        if (!transaction) {
          return [];
        }

        const previewRow = previewByTransactionId.get(transaction.id);

        if (!previewRow || transaction.categoryId || transaction.ignored) {
          return [];
        }

        return [
          transactionSchema.parse({
            ...transaction,
            categoryId: previewRow.categoryId,
            updatedAt: now,
          }),
        ];
      });

      if (updates.length === 0) {
        return {
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
        updatedCount: updates.length,
      };
    },
  );
}
