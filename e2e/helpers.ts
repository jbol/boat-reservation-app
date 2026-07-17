import { type Page, expect } from "@playwright/test";

/** A date inside the seeded summer-2026 season (Monday 20 July). */
export const SEED_DATE = "2026-07-20";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "tabarca-admin";

/** Pin the UI to English so assertions are locale-deterministic. */
export async function useEnglish(page: Page) {
  await page.goto("/lang/en");
  await expect(page.getByRole("link", { name: "EN" })).toBeVisible();
}

export async function loginAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByPlaceholder("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("link", { name: "Reservations" })).toBeVisible();
}
