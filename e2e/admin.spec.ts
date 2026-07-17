import { test, expect } from "@playwright/test";
import { SEED_DATE, loginAdmin, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
  await loginAdmin(page);
});

test("reservations dashboard loads", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("columnheader", { name: "Sailing" })).toBeVisible();
});

test("cancel a sailing then restore it (idempotent)", async ({ page }) => {
  await page.goto(`/admin/sailings?date=${SEED_DATE}`);

  // Bind to one specific sailing by its departure so pre-existing cancellations
  // of other rows (or a retry after a mid-test failure) can't misdirect us.
  // Kontiki 09:45 is the earliest departure on the seeded date.
  const row = page.getByRole("row").filter({ hasText: "· 09:45" });
  const cancelBtn = row.getByRole("button", { name: "Cancel sailing" });
  const restoreBtn = row.getByRole("button", { name: "Restore" });

  // Normalise starting state (in case a previous run/attempt left it cancelled).
  if (await restoreBtn.isVisible()) {
    await restoreBtn.click();
    await expect(cancelBtn).toBeVisible();
  }

  await cancelBtn.click();
  await expect(restoreBtn).toBeVisible();

  // Restore — leaves this exact sailing as we found it.
  await restoreBtn.click();
  await expect(cancelBtn).toBeVisible();
});
