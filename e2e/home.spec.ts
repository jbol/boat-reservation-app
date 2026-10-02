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

test("language switch redirects with a relative Location, back to the same page", async ({
  page,
  baseURL,
}) => {
  // The Location header must never carry a host: behind the hosting proxy the
  // server's own address is internal (this once sent visitors to 0.0.0.0).
  const back = await page.request.get("/lang/en", {
    maxRedirects: 0,
    headers: { referer: `${baseURL}/?date=${SEED_DATE}&from=alicante` },
  });
  expect(back.status()).toBe(307);
  expect(back.headers()["location"]).toBe(`/?date=${SEED_DATE}&from=alicante`);

  const noReferer = await page.request.get("/lang/es", { maxRedirects: 0 });
  expect(noReferer.headers()["location"]).toBe("/");

  const foreign = await page.request.get("/lang/en", {
    maxRedirects: 0,
    headers: { referer: "https://evil.example/somewhere" },
  });
  expect(foreign.headers()["location"]).toBe("/");
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
  // Pinned card order on a July date (three operators): Transtabarca, then
  // gold Marítimas Torrevieja keeping the navy and red cards apart, then Kontiki.
  const cardHeadings = page.locator("section:not(:has(section)) h3");
  await expect(cardHeadings.nth(0)).toHaveText("Transtabarca");
  await expect(cardHeadings.nth(1)).toHaveText("Marítimas Torrevieja");
  await expect(cardHeadings.nth(2)).toHaveText("Cruceros Kontiki");

  const kontikiCard = page
    .locator("section:not(:has(section))")
    .filter({ has: page.getByRole("heading", { name: "Cruceros Kontiki" }) });
  await expect(kontikiCard.getByText("Out", { exact: true })).toBeVisible();
  await expect(kontikiCard.getByText("Return", { exact: true })).toBeVisible();
  await expect(kontikiCard.getByText(/Schedules updated/)).toBeVisible();
  await expect(kontikiCard.getByText(/Last boat from Tabarca/)).toBeVisible();

  // Outbound chips open the save-a-trip page; return chips are not links.
  await kontikiCard.getByRole("link", { name: "09:45" }).click();
  await expect(page.getByRole("heading", { name: "Buy your ticket" })).toBeVisible();
});

test("quick buy: cards and time rows link straight to the operator's checkout", async ({
  page,
}) => {
  await page.goto(`/?date=${SEED_DATE}`);
  // One "Buy on <operator>" button per boat card, opening the operator's own
  // site in a new tab — no form in between.
  const cardBuy = page.locator("section:not(:has(section))").getByRole("link", { name: /^Buy on / });
  expect(await cardBuy.count()).toBeGreaterThanOrEqual(3);
  await expect(cardBuy.first()).toHaveAttribute("target", "_blank");
  await expect(cardBuy.first()).toHaveAttribute("rel", /noopener/);
  await expect(cardBuy.first()).toHaveAttribute("href", /^https?:\/\//);
  // The old by-time list is gone: the cards are the whole page.
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("September shows all five operators, Santa Pola boats first", async ({ page }) => {
  await page.goto("/?date=2026-09-05");
  const cardHeadings = page.locator("section:not(:has(section)) h3");
  await expect(cardHeadings).toHaveCount(5);
  // Santa Pola boats first, with navy between the two orange ones; then gold
  // Marítimas separating coral from the red Kontiki.
  await expect(cardHeadings.nth(0)).toHaveText("Tabarkeras");
  await expect(cardHeadings.nth(1)).toHaveText("Transtabarca");
  await expect(cardHeadings.nth(2)).toHaveText("Viajes Isla Tabarca");
  await expect(cardHeadings.nth(3)).toHaveText("Marítimas Torrevieja");
  await expect(cardHeadings.nth(4)).toHaveText("Cruceros Kontiki");

  // The rule itself: no two neighbouring cards have similar outline hues.
  const colours = await page
    .locator("section:not(:has(section))")
    .filter({ has: page.locator("h3") })
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopColor));
  const hue = (rgb: string) => {
    const [r, g, b] = rgb.match(/\d+/g)!.map((v) => Number(v) / 255);
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    if (delta === 0) return 0;
    const h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    return (h * 60 + 360) % 360;
  };
  const hues = colours.map(hue);
  expect(hues).toHaveLength(5);
  for (let i = 1; i < hues.length; i++) {
    const diff = Math.abs(hues[i] - hues[i - 1]);
    expect(Math.min(diff, 360 - diff), `cards ${i} and ${i + 1}`).toBeGreaterThanOrEqual(25);
  }
});

test("date past every horizon: honest empty state, no phantom 'no boats'", async ({ page }) => {
  // Well beyond the seeded data — every verified operator gets a "we don't
  // have it yet" placeholder in pinned order.
  await page.goto(`/?date=${shiftDateKey(DATA_END, 45)}`);
  const cardHeadings = page.locator("section:not(:has(section)) h3");
  await expect(cardHeadings).toHaveCount(5);
  await expect(cardHeadings.nth(0)).toHaveText("Tabarkeras");
  await expect(cardHeadings.nth(4)).toHaveText("Cruceros Kontiki");
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
  await expect(cardHeadings.nth(1)).toHaveText("Tabarkeras");
  await expect(cardHeadings.nth(2)).toHaveText("Transtabarca");
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

test("each boat card wears its operator's colour: outline, header band, buy button", async ({
  page,
}) => {
  await page.goto(`/?date=${SEED_DATE}`);
  const card = (name: string) =>
    page
      .locator("section:not(:has(section))")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  const WHITE = "rgb(255, 255, 255)";
  const INK = "rgb(15, 23, 42)";
  // Lettering is whichever of white/ink contrasts more with the boat colour:
  // white on navy and red, ink on gold.
  for (const [name, colour, lettering] of [
    ["Transtabarca", "rgb(17, 57, 95)", WHITE],
    ["Cruceros Kontiki", "rgb(211, 47, 47)", WHITE],
    ["Marítimas Torrevieja", "rgb(232, 171, 20)", INK],
  ] as const) {
    const c = card(name);
    await expect(c).toHaveCSS("border-top-color", colour);
    const band = c.locator("[data-band]");
    await expect(band).toHaveCSS("background-color", colour);
    await expect(c.getByRole("link", { name, exact: true })).toHaveCSS("color", lettering);
    const buy = c.getByRole("link", { name: /^Buy on / });
    await expect(buy).toHaveCSS("background-color", colour);
    await expect(buy).toHaveCSS("color", lettering);
  }
});

test("page never scrolls horizontally (mobile layout guard)", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});

test("Tabarca option shows return boats, informational only", async ({ page }) => {
  await page.goto(`/?date=${SEED_DATE}`);
  await page.getByLabel("From").selectOption("tabarca");
  await page.getByRole("button", { name: "Show boats" }).click();

  // Every card says where its return boats go (all three mainland ports)…
  await expect(page.getByText(/→ Santa Pola/).first()).toBeVisible();
  await expect(page.getByText(/→ Alicante/).first()).toBeVisible();
  await expect(page.getByText(/→ Torrevieja/).first()).toBeVisible();
  // …but nothing is bookable or buyable from the island: the return is
  // covered by the round-trip ticket.
  await expect(page.locator('a[href^="/book/"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Buy on / })).toHaveCount(0);
  await expect(page.getByText("Included in your round-trip ticket").first()).toBeVisible();
});
