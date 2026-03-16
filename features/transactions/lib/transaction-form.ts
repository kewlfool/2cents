import { z } from "zod";

import { parseMajorUnitToMinorUnits } from "@/lib/money";
import {
  isoDateSchema,
  transactionDirectionSchema,
  type Transaction,
} from "@/types";

export const transactionFormSchema = z.object({
  amountInput: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .refine((value) => {
      const amountMinor = parseMajorUnitToMinorUnits(value);
      return amountMinor !== null && amountMinor > 0;
    }, "Enter an amount greater than 0."),
  categoryId: z.string().trim().max(120),
  date: isoDateSchema,
  direction: transactionDirectionSchema,
  ignored: z.boolean(),
  merchantRaw: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(400),
  transferLike: z.boolean(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export type NormalizedTransactionFormValues = {
  amount: number;
  categoryId: string | null;
  date: string;
  direction: Transaction["direction"];
  ignored: boolean;
  merchantRaw: string;
  notes: string | null;
  transferLike: boolean;
};

export function createEmptyTransactionFormValues(
  defaultDate: string,
): TransactionFormValues {
  return {
    amountInput: "",
    categoryId: "",
    date: defaultDate,
    direction: "expense",
    ignored: false,
    merchantRaw: "",
    notes: "",
    transferLike: false,
  };
}

export function mapTransactionToFormValues(
  transaction: Transaction,
): TransactionFormValues {
  return {
    amountInput: (transaction.amount / 100).toFixed(2),
    categoryId: transaction.categoryId ?? "",
    date: transaction.date,
    direction: transaction.direction,
    ignored: transaction.ignored,
    merchantRaw: transaction.merchantRaw,
    notes: transaction.notes ?? "",
    transferLike: transaction.transferLike,
  };
}

export function normalizeTransactionFormValues(
  values: TransactionFormValues,
): NormalizedTransactionFormValues {
  const parsedValues = transactionFormSchema.parse(values);
  const amount = parseMajorUnitToMinorUnits(parsedValues.amountInput);

  if (amount === null || amount <= 0) {
    throw new Error("Transaction amount must be greater than 0.");
  }

  return {
    amount,
    categoryId: parsedValues.categoryId.trim() || null,
    date: parsedValues.date,
    direction: parsedValues.direction,
    ignored: parsedValues.ignored,
    merchantRaw: parsedValues.merchantRaw.trim(),
    notes: parsedValues.notes.trim() || null,
    transferLike: parsedValues.transferLike,
  };
}
