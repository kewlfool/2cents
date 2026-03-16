import type { BudgetCategory, MerchantRule, Transaction } from "@/types";

import { findMatchingMerchantRule } from "@/features/rules/lib/rule-matching";

export type RuleApplicationPreviewRow = {
  amount: number;
  categoryId: string;
  categoryName: string;
  date: string;
  direction: Transaction["direction"];
  merchantNormalized: string;
  merchantRaw: string;
  monthKey: string;
  ruleId: string;
  ruleLabel: string;
  transactionId: string;
};

export function previewMerchantRuleApplications(params: {
  categories: BudgetCategory[];
  rules: MerchantRule[];
  transactions: Transaction[];
}) {
  const categoryMap = new Map(
    params.categories
      .filter((category) => !category.archived)
      .map((category) => [category.id, category]),
  );

  return params.transactions
    .filter((transaction) => !transaction.ignored && !transaction.categoryId)
    .flatMap((transaction) => {
      const matchedRule = findMatchingMerchantRule(
        transaction.merchantNormalized,
        params.rules,
      );

      if (!matchedRule) {
        return [];
      }

      const matchedCategory = categoryMap.get(matchedRule.categoryId);

      if (!matchedCategory || matchedCategory.kind !== transaction.direction) {
        return [];
      }

      return [
        {
          amount: transaction.amount,
          categoryId: matchedCategory.id,
          categoryName: matchedCategory.name,
          date: transaction.date,
          direction: transaction.direction,
          merchantNormalized: transaction.merchantNormalized,
          merchantRaw: transaction.merchantRaw,
          monthKey: transaction.monthKey,
          ruleId: matchedRule.id,
          ruleLabel: `${matchedRule.matchType} "${matchedRule.pattern}"`,
          transactionId: transaction.id,
        } satisfies RuleApplicationPreviewRow,
      ];
    })
    .sort((left, right) => {
      if (right.date !== left.date) {
        return right.date.localeCompare(left.date);
      }

      return right.transactionId.localeCompare(left.transactionId);
    });
}
