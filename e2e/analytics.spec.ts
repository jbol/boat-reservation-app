import { test, expect } from "@playwright/test";
import { SEED_DATE, loginAdmin, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test("the buy hand-off forwards to the operator's own checkout and is kept out of search", async ({
  page,
}) => {
  const res = await page.request.get("/go/kontiki?source=card&date=2026-10-10", {
    maxRedirects: 0,
  });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toBe("https://cruceroskontiki.com/venta-de-tickets/");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");

  const unknown = await page.request.get("/go/not-an-operator", { maxRedirects: 0 });
  expect(unknown.status()).toBe(404);
});

test("page views and buy clicks show up in the admin stats", async ({ page }) => {
  // A real page view (the beacon fires on load) and a real hand-off click.
  await page.goto(`/?date=${SEED_DATE}`);
  await page.waitForResponse((r) => r.url().endsWith("/api/hit") && r.status() === 204);
  await page.request.get("/go/transtabarca?source=card&date=2026-10-10&from=santa-pola", {
    maxRedirects: 0,
  });

  await loginAdmin(page);
  await page.goto("/admin/stats?days=7");
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();

  // Scoped to the operator table: the "Pages" table also lists /horarios/transtabarca.
  const operatorTable = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Buy clicks by operator" }) });
  const transtabarca = operatorTable.getByRole("row").filter({ hasText: "Transtabarca" });
  await expect(transtabarca).toBeVisible();
  const clicks = Number((await transtabarca.getByRole("cell").nth(1).innerText()).trim());
  expect(clicks).toBeGreaterThanOrEqual(1);

  const home = page.getByRole("row").filter({ has: page.getByText("/", { exact: true }) });
  await expect(home.first()).toBeVisible();
});

test("robots.txt keeps the hand-off, admin and private pages out of search", async ({ page }) => {
  const res = await page.request.get("/robots.txt");
  expect(res.ok()).toBe(true);
  const text = await res.text();
  for (const path of ["/go/", "/admin", "/api/", "/r/", "/book/"]) {
    expect(text).toContain(`Disallow: ${path}`);
  }
});
