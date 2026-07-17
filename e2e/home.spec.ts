import { test, expect } from "@playwright/test";
import { SEED_DATE, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test("lists sailings from multiple operators for a date", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  await expect(page.getByRole("heading", { name: /Every boat to Tabarca/i })).toBeVisible();

  // Both a Santa Pola and an Alicante operator should appear.
  await expect(page.getByText("Cruceros Kontiki").first()).toBeVisible();
  await expect(page.getByText("Transtabarca").first()).toBeVisible();

  const bookLinks = page.locator('a[href^="/book/"]');
  expect(await bookLinks.count()).toBeGreaterThan(1);
});

test("language toggle switches ES/EN", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Every boat to Tabarca/i })).toBeVisible();

  await page.getByRole("link", { name: "ES" }).click();
  await expect(page.getByRole("heading", { name: /Todos los barcos a la Isla de Tabarca/i })).toBeVisible();
});
