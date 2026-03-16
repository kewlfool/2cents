import { z } from "zod";

const idSchema = z.string().trim().min(1).max(120);
const moneyMinorSchema = z.number().int();
const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/, {
  message: "Currency must be a 3-letter ISO code.",
});
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: "Date must be in YYYY-MM-DD format.",
  })
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
    message: "Date must be valid.",
  });
const isoDateTimeSchema = z.string().datetime({ offset: true });
const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
  message: "Month key must be in YYYY-MM format.",
});

export const categoryKindSchema = z.enum(["income", "expense"]);
export const categoryModeSchema = z.enum(["fixed", "variable"]);
export const transactionDirectionSchema = z.enum(["income", "expense"]);
export const transactionSourceTypeSchema = z.enum([
  "statement_import",
  "manual",
]);
export const merchantRuleMatchTypeSchema = z.enum([
  "exact",
  "contains",
  "startsWith",
  "regex",
]);
export const statementImportFormatSchema = z.enum(["csv", "xlsx", "seed"]);
export const statementImportStatusSchema = z.enum([
  "staged",
  "committed",
  "rolled_back",
]);
export const importWarningSeveritySchema = z.enum(["warning", "error"]);

export const importWarningSchema = z.object({
  column: z.string().trim().min(1).nullable(),
  message: z.string().trim().min(1),
  rowNumber: z.number().int().min(1),
  severity: importWarningSeveritySchema,
});

export const budgetCategorySchema = z.object({
  archived: z.boolean(),
  color: z.string().trim().min(1).max(32).nullable(),
  iconKey: z.string().trim().min(1).max(32).nullable(),
  id: idSchema,
  kind: categoryKindSchema,
  mode: categoryModeSchema,
  name: z.string().trim().min(1).max(80),
  plannedAmount: moneyMinorSchema,
  sortOrder: z.number().int().min(0),
});

export const budgetPlanSchema = z.object({
  archived: z.boolean(),
  categoryIds: z.array(idSchema),
  createdAt: isoDateTimeSchema,
  currency: currencyCodeSchema,
  expectedSavings: moneyMinorSchema,
  id: idSchema,
  isDefault: z.boolean(),
  monthStartDay: z.number().int().min(1).max(28),
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(500).nullable(),
  updatedAt: isoDateTimeSchema,
});

export const transactionSchema = z.object({
  amount: moneyMinorSchema.nonnegative(),
  categoryId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  date: isoDateSchema,
  direction: transactionDirectionSchema,
  id: idSchema,
  ignored: z.boolean(),
  merchantNormalized: z.string().trim().min(1).max(140),
  merchantRaw: z.string().trim().min(1).max(200),
  monthKey: monthKeySchema,
  notes: z.string().trim().max(400).nullable(),
  sourceImportId: idSchema.nullable(),
  sourceType: transactionSourceTypeSchema,
  transferLike: z.boolean(),
  updatedAt: isoDateTimeSchema,
});

export const statementImportSchema = z.object({
  checksum: z.string().trim().min(8).max(128).nullable(),
  columnMap: z.record(z.string(), z.string()),
  duplicateRowCount: z.number().int().min(0),
  fileName: z.string().trim().min(1).max(160),
  id: idSchema,
  importedAt: isoDateTimeSchema,
  importedRowCount: z.number().int().min(0),
  monthKey: monthKeySchema,
  sourceFormat: statementImportFormatSchema,
  status: statementImportStatusSchema,
  totalRowCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  warnings: z.array(importWarningSchema),
});

export const merchantRuleSchema = z
  .object({
    categoryId: idSchema,
    createdAt: isoDateTimeSchema,
    id: idSchema,
    isCaseSensitive: z.boolean(),
    matchType: merchantRuleMatchTypeSchema,
    pattern: z.string().trim().min(1).max(140),
    priority: z.number().int().min(0),
    updatedAt: isoDateTimeSchema,
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
        message:
          "Regex merchant rules must contain a valid regular expression.",
        path: ["pattern"],
      });
    }
  });

export const monthlySnapshotCategorySchema = z.object({
  actualAmount: moneyMinorSchema,
  categoryId: idSchema,
  categoryName: z.string().trim().min(1).max(80),
  categoryKind: categoryKindSchema,
  plannedAmount: moneyMinorSchema,
  variance: moneyMinorSchema,
});

export const monthlySnapshotSchema = z.object({
  actualExpenses: moneyMinorSchema,
  actualIncome: moneyMinorSchema,
  actualSavings: moneyMinorSchema,
  categoryBreakdown: z.array(monthlySnapshotCategorySchema),
  generatedAt: isoDateTimeSchema,
  monthKey: monthKeySchema,
  plannedExpenses: moneyMinorSchema,
  plannedIncome: moneyMinorSchema,
  plannedSavings: moneyMinorSchema,
  variance: moneyMinorSchema,
});

export const appSettingsSchema = z.object({
  activeBudgetPlanId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  currency: currencyCodeSchema,
  demoDataSeededAt: isoDateTimeSchema.nullable(),
  hasCompletedOnboarding: z.boolean(),
  id: z.literal("app-settings"),
  locale: z.string().trim().min(2).max(20),
  monthStartDay: z.number().int().min(1).max(28),
  updatedAt: isoDateTimeSchema,
});

export const appBackupDataSchema = z.object({
  appSettings: z.array(appSettingsSchema),
  budgetCategories: z.array(budgetCategorySchema),
  budgetPlans: z.array(budgetPlanSchema),
  merchantRules: z.array(merchantRuleSchema),
  monthlySnapshots: z.array(monthlySnapshotSchema),
  statementImports: z.array(statementImportSchema),
  transactions: z.array(transactionSchema),
});

export const appBackupSchema = z.object({
  data: appBackupDataSchema,
  exportedAt: isoDateTimeSchema,
  version: z.literal(1),
});

export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type CategoryMode = z.infer<typeof categoryModeSchema>;
export type TransactionDirection = z.infer<typeof transactionDirectionSchema>;
export type TransactionSourceType = z.infer<typeof transactionSourceTypeSchema>;
export type MerchantRuleMatchType = z.infer<typeof merchantRuleMatchTypeSchema>;
export type StatementImportFormat = z.infer<typeof statementImportFormatSchema>;
export type StatementImportStatus = z.infer<typeof statementImportStatusSchema>;
export type ImportWarningSeverity = z.infer<typeof importWarningSeveritySchema>;
export type ImportWarning = z.infer<typeof importWarningSchema>;
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;
export type BudgetPlan = z.infer<typeof budgetPlanSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type StatementImport = z.infer<typeof statementImportSchema>;
export type MerchantRule = z.infer<typeof merchantRuleSchema>;
export type MonthlySnapshotCategory = z.infer<
  typeof monthlySnapshotCategorySchema
>;
export type MonthlySnapshot = z.infer<typeof monthlySnapshotSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type AppBackupData = z.infer<typeof appBackupDataSchema>;
export type AppBackup = z.infer<typeof appBackupSchema>;

export {
  currencyCodeSchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
  moneyMinorSchema,
  monthKeySchema,
};
