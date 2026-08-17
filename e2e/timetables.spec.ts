import { test, expect } from "@playwright/test";
import { shiftDateKey } from "../lib/format";
import { loginAdmin, useEnglish } from "./helpers";

const SEASON_END = "2026-09-30";

/** First strictly-future Friday inside the seeded season, or null. */
function nextSeasonFriday(): string | null {
  const todayKey = new Date().toISOString().slice(0, 10);
  for (let i = 1; i <= 8; i++) {
    const key = shiftDateKey(todayKey, i);
    if (key > SEASON_END) return null;
    if (new Date(`${key}T12:00:00Z`).getUTCDay() === 5) return key;
  }
  return null;
}

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test("public schedule page shows patterns and verified chip", async ({ page }) => {
  await page.goto("/horarios/kontiki");
  await expect(page.getByRole("heading", { name: "Cruceros Kontiki schedules" })).toBeVisible();
  await expect(page.getByText("Schedules verified on")).toBeVisible();
  // Outbound pattern row (daily, per the 2026-08-17 re-verification).
  await expect(page.getByText("09:45 · 10:45 · 12:15 · 13:15")).toBeVisible();
  // Return route section is on the same page (EN port names — locale is pinned).
  await expect(page.getByText("Tabarca Island → Alicante")).toBeVisible();
});

test("operator name on home links to its schedule page", async ({ page }) => {
  await page.goto("/?date=2026-07-27");
  await page.getByRole("link", { name: "Transtabarca" }).first().click();
  await expect(page.getByRole("heading", { name: "Transtabarca schedules" })).toBeVisible();
});

test("edit pattern → apply → sailing appears on home → revert", async ({ page }) => {
  const friday = nextSeasonFriday();
  test.skip(!friday, "no future Friday left inside the seeded season");

  await loginAdmin(page);
  await page.goto("/admin/timetables");

  // The save-form for Kontiki's daily pattern (has the id input AND a Save button).
  const friForm = page
    .locator("form")
    .filter({ has: page.locator('input[name="id"][value="tt-kontiki-main"]') })
    .filter({ has: page.getByRole("button", { name: "Save" }) });
  const timesInput = friForm.getByLabel(/Departure times/);
  // Self-healing: strip our own test artifact in case a previous run failed
  // mid-test and left the pattern dirty — "original" must be the clean value.
  const original = (await timesInput.inputValue()).replace(/,?\s*20:00/g, "");

  const applyForm = page
    .locator("form")
    .filter({ has: page.locator('input[name="routeId"][value="route-kontiki-alicante"]') })
    .filter({ has: page.getByRole("button", { name: "Apply timetables" }) });

  // Add a 20:00 Friday departure and apply (without emailing anyone).
  await timesInput.fill(`${original}, 20:00`);
  await friForm.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Pattern saved")).toBeVisible();
  await applyForm.getByRole("checkbox").uncheck();
  await applyForm.getByRole("button", { name: "Apply timetables" }).click();
  await expect(page.getByText(/Applied to route-kontiki-alicante/)).toBeVisible();

  await page.goto(`/?date=${friday}&from=alicante`);
  // Scoped to sailing cards — the weather strip also shows a "20:00" hour.
  await expect(page.getByRole("listitem").filter({ hasText: "20:00" })).toHaveCount(1);

  // Revert the pattern and apply again — the empty 20:00 sailings are removed.
  await page.goto("/admin/timetables");
  await friForm.getByLabel(/Departure times/).fill(original);
  await friForm.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Pattern saved")).toBeVisible();
  await applyForm.getByRole("checkbox").uncheck();
  await applyForm.getByRole("button", { name: "Apply timetables" }).click();
  await expect(page.getByText(/Applied to route-kontiki-alicante/)).toBeVisible();

  await page.goto(`/?date=${friday}&from=alicante`);
  await expect(page.getByRole("listitem").filter({ hasText: "20:00" })).toHaveCount(0);
});
