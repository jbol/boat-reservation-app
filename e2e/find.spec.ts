import { test, expect } from "@playwright/test";
import { useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test("booking lookup always confirms without leaking whether the email exists", async ({ page }) => {
  await page.goto("/find");
  await expect(page.getByRole("heading", { name: "Find your reservations" })).toBeVisible();

  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByRole("button", { name: "Email me my bookings" }).click();

  await expect(page).toHaveURL(/\/find\?sent=1/);
  await expect(page.getByText(/If there are reservations for that email/i)).toBeVisible();
});
