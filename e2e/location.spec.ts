import { test, expect, type Page } from "@playwright/test";
import { SEED_DATE, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

/** Forget the detection that ran on the language-switch landing page, so the
 *  next page load runs it afresh. */
async function freshVisit(page: Page, url: string) {
  await page.waitForFunction(() => window.sessionStorage.getItem("tb-geo") !== null);
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto(url);
}

test.describe("standing at Santa Pola harbour", () => {
  test.use({ permissions: ["geolocation"], geolocation: { latitude: 38.1905, longitude: -0.558 } });

  test("picks Santa Pola automatically; one tap shows every port again", async ({ page }) => {
    await freshVisit(page, `/?date=${SEED_DATE}`);

    await expect(page).toHaveURL(/from=santa-pola/);
    await expect(page.getByRole("status")).toContainText("Boats from Santa Pola, your nearest port");
    await expect(page.getByLabel("From")).toHaveValue("santa-pola");
    await expect(page.getByRole("heading", { name: "Transtabarca" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cruceros Kontiki" })).toHaveCount(0);

    // Never a silent filter: the notice offers the way back, and it sticks.
    await page.getByRole("link", { name: "See all ports" }).click();
    await expect(page.getByRole("heading", { name: "Cruceros Kontiki" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Cruceros Kontiki" })).toBeVisible();
    await expect(page).not.toHaveURL(/from=santa-pola/);
  });
});

test.describe("standing on Tabarca", () => {
  test.use({ permissions: ["geolocation"], geolocation: { latitude: 38.1667, longitude: -0.476 } });

  test("switches to the return boats", async ({ page }) => {
    await freshVisit(page, `/?date=${SEED_DATE}`);

    await expect(page).toHaveURL(/from=tabarca/);
    await expect(page.getByRole("status")).toContainText("You're on the island");
    await expect(page.locator('a[href^="/book/"]')).toHaveCount(0);
    await expect(page.getByText("Included in your round-trip ticket").first()).toBeVisible();
  });
});

test.describe("far from every port", () => {
  test.use({ permissions: ["geolocation"], geolocation: { latitude: 40.4168, longitude: -3.7038 } });

  test("makes no guess and filters nothing", async ({ page }) => {
    await freshVisit(page, `/?date=${SEED_DATE}`);

    await page.waitForFunction(() => window.sessionStorage.getItem("tb-geo") === "none");
    await expect(page).not.toHaveURL(/from=/);
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Cruceros Kontiki" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Transtabarca" })).toBeVisible();
  });
});

test("without location permission nothing is filtered; the button stays available", async ({
  page,
}) => {
  await page.goto(`/?date=${SEED_DATE}`);

  await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cruceros Kontiki" })).toBeVisible();
  await expect(page).not.toHaveURL(/from=/);
  await expect(page.getByRole("status")).toHaveCount(0);
});
