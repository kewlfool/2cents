import { z } from "zod";

import { merchantRuleMatchTypeSchema } from "@/types";

export const merchantRuleFormSchema = z
  .object({
    categoryId: z.string().trim().min(1, "Choose a category."),
    isCaseSensitive: z.boolean(),
    matchType: merchantRuleMatchTypeSchema,
    pattern: z.string().trim().min(1, "Pattern is required.").max(140),
    priority: z.number().int().min(0).max(10_000),
  })
  .superRefine((value, context) => {
    if (value.matchType !== "regex") {
      return;
    }

    try {
      new RegExp(value.pattern, value.isCaseSensitive ? "" : "i");
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Regex rules must contain a valid regular expression.",
        path: ["pattern"],
      });
    }
  });

export type MerchantRuleFormValues = z.infer<typeof merchantRuleFormSchema>;

export function createEmptyMerchantRuleFormValues(
  categoryId: string | null = null,
): MerchantRuleFormValues {
  return {
    categoryId: categoryId ?? "",
    isCaseSensitive: false,
    matchType: "contains",
    pattern: "",
    priority: 100,
  };
}
