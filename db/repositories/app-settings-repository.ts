import { appSettingsSchema, type AppSettings } from "@/types";

import { getAppDatabase, type TwoCentsDatabase } from "@/db/app-database";

export async function getAppSettings(db: TwoCentsDatabase = getAppDatabase()) {
  const settings = await db.appSettings.get("app-settings");

  return settings ? appSettingsSchema.parse(settings) : null;
}

export async function putAppSettings(
  settings: AppSettings,
  db: TwoCentsDatabase = getAppDatabase(),
) {
  const parsedSettings = appSettingsSchema.parse(settings);
  await db.appSettings.put(parsedSettings);
  return parsedSettings;
}
