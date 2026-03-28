import fs from "node:fs/promises";

import { expect, test } from "@playwright/test";

test("budget setup creates baseline categories in the active plan", async ({
  page,
}) => {
  await page.goto("/budget-setup");

  await expect(
    page.getByRole("heading", { name: "Budget setup" }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add expense" }).click();
  await page
    .locator('input[id^="budget-category-name-"]')
    .last()
    .fill("Emergency Fund");
  await page.locator('input[id^="budget-category-amount-"]').last().fill("120");
  await page.getByRole("button", { name: "Save baseline" }).click();

  await expect(page.getByText(/Budget baseline saved\./)).toBeVisible();
  await expect
    .poll(async () => {
      return page
        .locator('input[id^="budget-category-name-"]')
        .evaluateAll((nodes) =>
          nodes.some(
            (node) => (node as HTMLInputElement).value === "Emergency Fund",
          ),
        );
    })
    .toBe(true);
});

test("imports screen rolls back and deletes a saved import record", async ({
  page,
}) => {
  await page.goto("/imports");

  await page.locator("#statement-import-file").setInputFiles({
    buffer: Buffer.from(
      [
        "Date,Merchant,Amount",
        "03/11/2026,Rollback Cafe,14.20",
      ].join("\n"),
    ),
    mimeType: "text/csv",
    name: "rollback-statement.csv",
  });

  await page.getByRole("button", { name: "Save import" }).click();
  await expect(
    page.getByText(/Imported 1 transactions from rollback-statement\.csv/),
  ).toBeVisible();

  const importRecord = page.getByLabel("rollback-statement.csv import record");

  page.once("dialog", (dialog) => dialog.accept());
  await importRecord.getByRole("button", { name: "Roll back import" }).click();

  await expect(
    page.getByText(/Rolled back rollback-statement\.csv/),
  ).toBeVisible();
  await expect(importRecord.getByText("rolled_back")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await importRecord.getByRole("button", { name: "Delete record" }).click();

  await expect(
    page.getByText(/Deleted the import record for rollback-statement\.csv/),
  ).toBeVisible();
  await expect(
    page.getByText("rollback-statement.csv", { exact: true }),
  ).toHaveCount(0);
});

test("settings screen exports, resets, and restores a JSON backup", async ({
  browserName,
  page,
}, testInfo) => {
  test.skip(
    browserName !== "chromium",
    "Backup download assertions are covered in Chromium for this release-hardening flow.",
  );

  await page.goto("/settings");

  const backupPath = testInfo.outputPath("2cents-backup.json");
  const downloadPromise = page.waitForEvent("download");

  await page.getByRole("button", { name: "Export JSON backup" }).click();

  const download = await downloadPromise;
  await download.saveAs(backupPath);

  const backupContents = await fs.readFile(backupPath, "utf8");
  expect(backupContents).toContain('"version": 1');
  expect(backupContents).toContain('"transactions"');

  await page.getByLabel("Reseed demo data after reset").uncheck();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset local data" }).click();

  await expect(
    page.getByText(/Cleared all local data from this browser\./),
  ).toBeVisible();
  await expect(
    page.getByText(/0 imports, 0 rules, and 0 monthly snapshots/),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#settings-backup-import").setInputFiles(backupPath);

  await expect(
    page.getByText(/Imported .*2cents-backup\.json.*replaced the current local dataset\./),
  ).toBeVisible();
  await expect(
    page.getByText(/0 imports, 0 rules, and 0 monthly snapshots/),
  ).toHaveCount(0);
});

test("dashboard quick actions support keyboard activation", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Keyboard activation smoke coverage is desktop-focused.",
  );

  await page.goto("/");

  const importLink = page
    .getByRole("link", { name: "Import statement" })
    .first();

  await importLink.focus();
  await expect(importLink).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Imports" }).first()).toBeVisible();
});
