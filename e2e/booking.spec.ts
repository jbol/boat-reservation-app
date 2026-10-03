import { test, expect } from "@playwright/test";
import { SEED_DATE, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test("book → hand-off intent → attach reference → confirmed", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  await page.locator('a[href^="/book/"]').first().click();

  // Booking page: the primary action is one click to the operator's checkout.
  await expect(page.getByRole("heading", { name: "Buy your ticket" })).toBeVisible();
  const quickBuy = page.getByRole("link", { name: /^Buy on / });
  await expect(quickBuy).toHaveAttribute("target", "_blank");
  await expect(quickBuy).toHaveAttribute("rel", /noopener/);
  await expect(quickBuy).toHaveAttribute("href", /^\/go\/[a-z-]+\?source=booking&sailing=/);

  // Saving the trip is optional and collapsed for guests.
  await expect(page.getByLabel("Full name")).toBeHidden();
  await page.getByText("Save this trip (optional)").click();
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByLabel(/Adult \(round trip\)/).fill("2");
  await page.getByRole("button", { name: "Save trip" }).click();

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
