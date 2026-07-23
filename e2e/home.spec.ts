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

test("port filter narrows the list to one origin", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  await page.getByLabel("From").selectOption("torrevieja");
  await page.getByRole("button", { name: "Show boats" }).click();

  await expect(page.getByText("Marítimas Torrevieja").first()).toBeVisible();
  await expect(page.getByText("Cruceros Kontiki")).toHaveCount(0);
  // Torrevieja is a fixed-return day trip, not an open return.
  await expect(page.getByText("Day trip (fixed return)").first()).toBeVisible();
});

test("Tabarca option shows return boats, informational only", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  await page.getByLabel("From").selectOption("tabarca");
  await page.getByRole("button", { name: "Show boats" }).click();

  // Return crossings to all three mainland ports are listed…
  await expect(page.getByText("→ Santa Pola").first()).toBeVisible();
  await expect(page.getByText("→ Alicante").first()).toBeVisible();
  await expect(page.getByText("→ Torrevieja").first()).toBeVisible();
  // …but they are not bookable: covered by the round-trip ticket.
  await expect(page.locator('a[href^="/book/"]')).toHaveCount(0);
  await expect(page.getByText("Included in your round-trip ticket").first()).toBeVisible();
});
