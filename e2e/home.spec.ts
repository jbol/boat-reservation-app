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

test("page never scrolls horizontally (mobile layout guard)", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement!;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
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
