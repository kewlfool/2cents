import { z } from "zod";

import { currencyCodeSchema } from "@/types";

export const settingsPreferencesFormSchema = z.object({
  currency: currencyCodeSchema,
  monthStartDay: z.number().int().min(1).max(28),
});

export type SettingsPreferencesFormValues = z.infer<
  typeof settingsPreferencesFormSchema
>;

export function createSettingsPreferencesFormValues(input?: {
  currency?: string | null;
  monthStartDay?: number | null;
}): SettingsPreferencesFormValues {
  return {
    currency: input?.currency ?? "USD",
    monthStartDay: input?.monthStartDay ?? 1,
  };
}
