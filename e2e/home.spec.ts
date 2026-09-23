import { test, expect, type Page } from "@playwright/test";
import { shiftDateKey } from "../lib/format";
import { DATA_END, OCT_END, SEED_DATE, useEnglish } from "./helpers";

/** Page must never scroll horizontally (the reason for the Pixel 7 project). */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement!;
    return el.scrollWidth - el.clientWidth;
  });
}

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

  await page.getByRole("link", { name: "ES", exact: true }).click();
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

test("boat cards show out and return times; time chips open booking", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);

  // Leaf sections only — the page also wraps the whole sailings area in a <section>.
  // Pinned card order: Transtabarca, Kontiki, then Marítimas Torrevieja.
  const cardHeadings = page.locator("section:not(:has(section)) h3");
  await expect(cardHeadings.nth(0)).toHaveText("Transtabarca");
  await expect(cardHeadings.nth(1)).toHaveText("Cruceros Kontiki");

  const kontikiCard = page
    .locator("section:not(:has(section))")
    .filter({ has: page.getByRole("heading", { name: "Cruceros Kontiki" }) });
  await expect(kontikiCard.getByText("Out", { exact: true })).toBeVisible();
  await expect(kontikiCard.getByText("Return", { exact: true })).toBeVisible();
  await expect(kontikiCard.getByText(/Schedules updated/)).toBeVisible();
  await expect(kontikiCard.getByText(/Last boat from Tabarca/)).toBeVisible();

  // Outbound chips are the booking entry point; return chips are not links.
  await kontikiCard.getByRole("link", { name: "09:45" }).click();
  await expect(page.getByRole("heading", { name: "Book your trip" })).toBeVisible();
});

test("September shows all five operators, Santa Pola boats first", async ({ page }) => {
  await page.goto("/?date=2026-09-05");
  const cardHeadings = page.locator("section:not(:has(section)) h3");
  await expect(cardHeadings).toHaveCount(5);
  await expect(cardHeadings.nth(0)).toHaveText("Transtabarca");
  await expect(cardHeadings.nth(1)).toHaveText("Tabarkeras");
  await expect(cardHeadings.nth(2)).toHaveText("Viajes Isla Tabarca");
  await expect(cardHeadings.nth(3)).toHaveText("Cruceros Kontiki");
  await expect(cardHeadings.nth(4)).toHaveText("Marítimas Torrevieja");
});

test("date past every horizon: honest empty state, no phantom 'no boats'", async ({ page }) => {
  // Well beyond the seeded data — every verified operator gets a "we don't
  // have it yet" placeholder in pinned order.
  await page.goto(`/?date=${shiftDateKey(DATA_END, 45)}`);
  const cardHeadings = page.locator("section:not(:has(section)) h3");
  await expect(cardHeadings).toHaveCount(5);
  await expect(cardHeadings.nth(0)).toHaveText("Transtabarca");
  await expect(cardHeadings.nth(4)).toHaveText("Marítimas Torrevieja");
  await expect(page.getByText("We don't have this date's schedule yet")).toHaveCount(5);
  await expect(page.getByText(/don't have the operators' schedules for this date/)).toBeVisible();
  // Nothing bookable, and no misleading "no departures on record".
  await expect(page.locator('a[href^="/book/"]')).toHaveCount(0);
  await expect(page.getByText("No departures on record")).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test("date past some horizons: bookable cards first, then placeholders", async ({ page }) => {
  // Tuesday 10 Nov: only Marítimas Torrevieja's data reaches this far (Tue/Thu/
  // Sat day trips until 21 Nov); the other four operators' seasons end 31 Oct.
  await page.goto(`/?date=${shiftDateKey(OCT_END, 10)}`);
  const cardHeadings = page.locator("section:not(:has(section)) h3");
  await expect(cardHeadings).toHaveCount(5);
  await expect(cardHeadings.nth(0)).toHaveText("Marítimas Torrevieja");
  await expect(cardHeadings.nth(1)).toHaveText("Transtabarca");
  await expect(cardHeadings.nth(2)).toHaveText("Tabarkeras");
  await expect(cardHeadings.nth(3)).toHaveText("Viajes Isla Tabarca");
  await expect(cardHeadings.nth(4)).toHaveText("Cruceros Kontiki");

  const maritimasCard = page
    .locator("section:not(:has(section))")
    .filter({ has: page.getByRole("heading", { name: "Marítimas Torrevieja" }) });
  await expect(maritimasCard.getByText("Out", { exact: true })).toBeVisible();

  const transtabarcaCard = page
    .locator("section:not(:has(section))")
    .filter({ has: page.getByRole("heading", { name: "Transtabarca" }) });
  await expect(transtabarcaCard.getByText("We don't have this date's schedule yet")).toBeVisible();
  // Placeholders still say where the boat leaves from.
  await expect(transtabarcaCard.getByText("from Santa Pola")).toBeVisible();
  // The by-time list still has the Marítimas departure — no global empty state.
  await expect(page.getByText(/don't have the operators' schedules/)).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test("page never scrolls horizontally (mobile layout guard)", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  // List-row descriptions must keep a readable column — guards against the
  // price/button group squeezing the text into one-word-per-line wrapping.
  const descWidth = await page
    .locator("main li p.text-sm")
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(descWidth).toBeGreaterThan(180);
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
