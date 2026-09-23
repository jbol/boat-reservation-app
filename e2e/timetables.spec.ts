import { test, expect } from "@playwright/test";
import { shiftDateKey } from "../lib/format";
import { DATA_END, OCT_END, SUMMER_END, loginAdmin, useEnglish } from "./helpers";

/** First strictly-future Friday within Kontiki's seeded patterns, with the
 *  pattern row that covers it (weekday grid to 30 Sep, October daily row). */
function nextKontikiFriday(): { friday: string; rowId: string } | null {
  const todayKey = new Date().toISOString().slice(0, 10);
  for (let i = 1; i <= 8; i++) {
    const key = shiftDateKey(todayKey, i);
    if (key > OCT_END) return null;
    if (new Date(`${key}T12:00:00Z`).getUTCDay() !== 5) continue;
    return { friday: key, rowId: key <= SUMMER_END ? "tt-kontiki-wk" : "tt-kontiki-oct" };
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
  // Outbound pattern rows after the 2026-09-23 re-verification: the retired
  // daily grid (kept as history) and the weekend grid share the same four
  // times; weekdays lost 13:15; October is a single daily 10:45.
  await expect(page.getByText("09:45 · 10:45 · 12:15 · 13:15", { exact: true })).toHaveCount(2);
  await expect(page.getByText("09:45 · 10:45 · 12:15", { exact: true })).toBeVisible();
  // Return route section is on the same page (EN port names — locale is pinned).
  await expect(page.getByText("Tabarca Island → Alicante")).toBeVisible();
});

test("operator name on home links to its schedule page", async ({ page }) => {
  await page.goto("/?date=2026-07-27");
  await page.getByRole("link", { name: "Transtabarca" }).first().click();
  await expect(page.getByRole("heading", { name: "Transtabarca schedules" })).toBeVisible();
});

test("admin timetables shows per-operator data horizons", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/timetables");
  const operatorSection = (name: string) =>
    page
      .locator("section:not(:has(section))")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  // Each chip belongs to its own operator: four seasons end 31 Oct, Marítimas
  // Torrevieja's November day trips run to the global horizon.
  await expect(operatorSection("Cruceros Kontiki").getByText(`data until ${OCT_END}`)).toBeVisible();
  await expect(operatorSection("Marítimas Torrevieja").getByText(`data until ${DATA_END}`)).toBeVisible();
  await expect(page.getByText(`data until ${OCT_END}`)).toHaveCount(4);
});

test("edit pattern → apply → sailing appears on home → revert", async ({ page }) => {
  const next = nextKontikiFriday();
  test.skip(!next, "no future Friday left inside Kontiki's seeded patterns");
  const { friday, rowId } = next!;

  await loginAdmin(page);
  await page.goto("/admin/timetables");

  // The save-form for the Kontiki pattern covering that Friday (has the id
  // input AND a Save button).
  const friForm = page
    .locator("form")
    .filter({ has: page.locator(`input[name="id"][value="${rowId}"]`) })
    .filter({ has: page.getByRole("button", { name: "Save" }) });
  const timesInput = friForm.getByLabel(/Departure times/);
  // Self-healing: strip our own test artifact in case a previous run failed
  // mid-test and left the pattern dirty — "original" must be the clean value.
  const original = (await timesInput.inputValue()).replace(/,?\s*20:00/g, "");

  const applyForm = page
    .locator("form")
    .filter({ has: page.locator('input[name="operatorId"][value="op-kontiki"]') })
    .filter({ has: page.getByRole("button", { name: "Apply timetables" }) });

  // Add a 20:00 Friday departure and apply (without emailing anyone).
  await timesInput.fill(`${original}, 20:00`);
  await friForm.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Pattern saved")).toBeVisible();
  await applyForm.getByRole("checkbox").uncheck();
  await applyForm.getByRole("button", { name: "Apply timetables" }).click();
  await expect(page.getByText(/Applied Cruceros Kontiki/)).toBeVisible();

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
  await expect(page.getByText(/Applied Cruceros Kontiki/)).toBeVisible();

  await page.goto(`/?date=${friday}&from=alicante`);
  await expect(page.getByRole("listitem").filter({ hasText: "20:00" })).toHaveCount(0);
});
