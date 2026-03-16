import { describe, expect, it } from "vitest";

import { findMatchingMerchantRule } from "@/features/rules/lib/rule-matching";
import type { MerchantRule } from "@/types";

const createdAt = "2026-03-15T12:00:00.000Z";

function createRule(overrides: Partial<MerchantRule>): MerchantRule {
  return {
    categoryId: "category-groceries",
    createdAt,
    id: crypto.randomUUID(),
    isCaseSensitive: false,
    matchType: "contains",
    pattern: "WHOLE",
    priority: 10,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe("merchant rule matching", () => {
  it("prefers the highest priority rule", () => {
    const match = findMatchingMerchantRule("WHOLE FOODS", [
      createRule({
        id: "rule-low",
        pattern: "WHOLE",
        priority: 20,
      }),
      createRule({
        id: "rule-high",
        pattern: "WHOLE FOODS",
        priority: 100,
      }),
    ]);

    expect(match?.id).toBe("rule-high");
  });

  it("supports regex rules safely", () => {
    const match = findMatchingMerchantRule("UBER TRIP", [
      createRule({
        categoryId: "category-transport",
        id: "rule-regex",
        matchType: "regex",
        pattern: "^UBER\\b",
        priority: 50,
      }),
    ]);

    expect(match?.id).toBe("rule-regex");
  });
});
