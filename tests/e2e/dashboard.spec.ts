import { expect, test } from "@playwright/test";

test("dashboard shell renders primary workspace routes", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "2cents dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Import statement" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review transactions" }).first(),
  ).toBeVisible();
});

test("budget setup allows a manual baseline save", async ({ page }) => {
  await page.goto("/budget-setup");

  await expect(
    page.getByRole("heading", { name: "Budget setup" }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add expense" }).click();
  await page
    .locator('input[id^="budget-category-name-"]')
    .last()
    .fill("Household buffer");
  await page.locator('input[id^="budget-category-amount-"]').last().fill("45");
  await page.getByRole("button", { name: "Save baseline" }).click();

  await expect(page.getByText(/Budget baseline saved\./)).toBeVisible();
});

test("imports screen stages and saves a statement csv", async ({ page }) => {
  await page.goto("/imports");

  await expect(page.getByRole("heading", { name: "Imports" }).first()).toBeVisible();

  await page.locator("#statement-import-file").setInputFiles({
    buffer: Buffer.from(
      [
        "Date,Merchant,Amount",
        "03/29/2026,Whole Foods Market,12.34",
        "03/30/2026,Blue Bottle Coffee,4.25",
      ].join("\n"),
    ),
    mimeType: "text/csv",
    name: "march-statement.csv",
  });

  await expect(page.getByText("Ready to import")).toBeVisible();
  await expect(page.getByText("Whole Foods Market", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save import" }).click();

  await expect(
    page.getByText(/Imported 2 transactions from march-statement\.csv/),
  ).toBeVisible();
  await expect(page.getByText("march-statement.csv", { exact: true })).toBeVisible();
});

test("transactions screen supports manual correction workflows", async ({
  page,
}) => {
  await page.goto("/transactions");

  await expect(
    page.getByRole("heading", { name: "Transactions" }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add manual transaction" }).click();
  await page
    .getByRole("textbox", { exact: true, name: "Merchant" })
    .fill("Cash Grocer");
  await page.getByLabel("Date", { exact: true }).fill("2026-03-14");
  await page.getByLabel("Amount", { exact: true }).fill("18.75");
  await page.getByRole("button", { name: "Create transaction" }).click();

  await expect(page.getByText(/Saved transaction for Cash Grocer\./)).toBeVisible();

  await page.getByLabel("Search merchant or notes").fill("Cash Grocer");
  const cashGrocerRow = page.locator("article").filter({
    hasText: "Cash Grocer",
  });

  await expect(cashGrocerRow).toHaveCount(1);
  await cashGrocerRow.getByLabel("Select Cash Grocer").check();
  await page.getByLabel("Bulk category").selectOption("category-groceries");
  await page.getByRole("button", { name: "Apply category" }).click();

  await expect(
    page.getByText(/Categorized 1 transactions as Groceries\./),
  ).toBeVisible();
  await expect(cashGrocerRow.getByText("Groceries")).toBeVisible();

  await page.getByLabel("Ignored filter").selectOption("all");
  await cashGrocerRow.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Ignore in rollups").check();
  await page.getByRole("button", { name: "Save transaction" }).click();

  await expect(page.getByText(/Saved transaction for Cash Grocer\./)).toBeVisible();
  await expect(cashGrocerRow.getByText("Ignored")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete transaction" }).click();

  await expect(
    page.getByText(/Deleted transaction for Cash Grocer\./),
  ).toBeVisible();
  await expect(
    page.locator("article").filter({
      hasText: "Cash Grocer",
    }),
  ).toHaveCount(0);
});

test("settings screen saves local preferences and updates month labels", async ({
  page,
}) => {
  await page.goto("/settings");

  await expect(
    page.getByRole("heading", { name: "Settings" }).first(),
  ).toBeVisible();

  await page.getByLabel("Currency code").fill("CAD");
  await page.getByLabel("Month start day").selectOption("15");
  await page.getByRole("button", { name: "Save preferences" }).click();

  await expect(
    page.getByText(/Saved local preferences for CAD with a day 15 month start\./),
  ).toBeVisible({ timeout: 10_000 });

  await page.goto("/transactions");
  await expect(page.getByLabel("Month")).toContainText("Mar 15 - Apr 14, 2026");
});

test("rules screen tests a seeded merchant rule", async ({ page }) => {
  await page.goto("/rules");

  await expect(page.getByRole("heading", { name: "Rules" }).first()).toBeVisible();
  await page.getByLabel("Sample merchant").fill("Whole Foods Market");
  await expect(page.getByText(/Category: Groceries/)).toBeVisible();
});

test("rules screen creates and tests a merchant rule", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Rule creation is already covered by unit tests; mobile WebKit is flaky on this form interaction.",
  );

  await page.goto("/rules");

  await expect(page.getByRole("heading", { name: "Rules" }).first()).toBeVisible();
  await page.getByLabel("Pattern").fill("CORNER MARKET");
  await page.getByLabel("Match type").selectOption("exact");
  await page.getByLabel("Category").selectOption("category-groceries");
  await page.getByRole("button", { name: "Save rule" }).click();

  await expect(
    page.getByText("CORNER MARKET", { exact: true }).last(),
  ).toBeVisible();
  await page.getByLabel("Sample merchant").fill("Corner Market");
  await expect(page.getByText(/Category: Groceries/)).toBeVisible();
});

test("monthly review expands category transactions", async ({ page }) => {
  await page.goto("/monthly-review");

  await expect(
    page.getByRole("heading", { name: "Monthly review" }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show transactions for Groceries" })
    .click();

  await expect(
    page.getByText("Whole Foods Market", { exact: true }),
  ).toBeVisible();
});
