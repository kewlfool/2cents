import type { MerchantRule } from "@/types";

export function sortMerchantRules(rules: MerchantRule[]) {
  return [...rules].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    if (left.createdAt !== right.createdAt) {
      return left.createdAt.localeCompare(right.createdAt);
    }

    return left.id.localeCompare(right.id);
  });
}

export function merchantMatchesRule(
  merchantNormalized: string,
  rule: MerchantRule,
) {
  const source = rule.isCaseSensitive
    ? merchantNormalized
    : merchantNormalized.toUpperCase();
  const pattern = rule.isCaseSensitive ? rule.pattern : rule.pattern.toUpperCase();

  switch (rule.matchType) {
    case "exact":
      return source === pattern;
    case "contains":
      return source.includes(pattern);
    case "startsWith":
      return source.startsWith(pattern);
    case "regex":
      try {
        return new RegExp(rule.pattern, rule.isCaseSensitive ? "" : "i").test(
          merchantNormalized,
        );
      } catch {
        return false;
      }
  }
}

export function findMatchingMerchantRule(
  merchantNormalized: string,
  rules: MerchantRule[],
) {
  const orderedRules = sortMerchantRules(rules);

  return (
    orderedRules.find((rule) => merchantMatchesRule(merchantNormalized, rule)) ??
    null
  );
}
