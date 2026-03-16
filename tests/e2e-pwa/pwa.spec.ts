import { expect, test } from "@playwright/test";

test("production preview exposes a manifest and registers a service worker", async ({
  page,
}) => {
  test.slow();

  await page.goto("/2cents/");

  await expect(
    page.locator('link[rel="manifest"]'),
  ).toHaveAttribute("href", "/2cents/manifest.webmanifest");

  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        const registration =
          await navigator.serviceWorker.getRegistration("/2cents/");
        return registration?.scope ?? null;
      });
    })
    .toContain("/2cents/");
});

test("production preview can reopen a cached workspace route while offline", async ({
  context,
  page,
}) => {
  test.slow();

  await page.goto("/2cents/settings");
  await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();

  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        const registration =
          await navigator.serviceWorker.getRegistration("/2cents/");
        return Boolean(registration?.active);
      });
    })
    .toBe(true);

  await page.reload();

  await expect
    .poll(async () => {
      return page.evaluate(() => Boolean(navigator.serviceWorker.controller));
    })
    .toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
  await expect(
    page.getByText("PWA support depends on production builds and browser capability."),
  ).toBeVisible();
});
