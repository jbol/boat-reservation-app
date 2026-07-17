import { test, expect } from "@playwright/test";
import { SEED_DATE, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test("book → hand-off intent → attach reference → confirmed", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  await page.locator('a[href^="/book/"]').first().click();

  // Booking form
  await expect(page.getByRole("heading", { name: "Book your trip" })).toBeVisible();
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByLabel(/Adult \(round trip\)/).fill("2");
  await page.getByRole("button", { name: "Continue" }).click();

  // Reservation page — intent state
  await expect(page).toHaveURL(/\/r\/.+/);
  await expect(page.getByText("Pending purchase")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy on/ })).toBeVisible();

  // Attach the operator booking reference
  await page.getByLabel("Booking reference").fill("E2E-REF-123");
  await page.getByRole("button", { name: "Save reference" }).click();

  // Confirmed
  await expect(page.getByText("Confirmed")).toBeVisible();
  await expect(page.getByText("E2E-REF-123")).toBeVisible();
});
