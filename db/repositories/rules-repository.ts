import { merchantRuleSchema, type MerchantRule } from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";

export async function listMerchantRules(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const rules = await db.merchantRules.orderBy("priority").reverse().toArray();
  return rules.map((rule) => merchantRuleSchema.parse(rule));
}

export async function countMerchantRules(
  db: TwoCentsDatabase = getAppDatabase(),
) {
  return db.merchantRules.count();
}

export async function bulkPutMerchantRules(
  rules: MerchantRule[],
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedRules = rules.map((rule) => merchantRuleSchema.parse(rule));
  await db.merchantRules.bulkPut(parsedRules);
  return parsedRules;
}
