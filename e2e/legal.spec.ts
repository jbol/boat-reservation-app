import { test, expect } from "@playwright/test";
import { useEnglish } from "./helpers";

test("legal pages render in both languages and are linked from the footer", async ({ page }) => {
  await useEnglish(page);

  await page.goto("/privacidad");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText("never see or store", { exact: false })).toBeVisible();

  await page.goto("/terminos");
  await expect(page.getByRole("heading", { name: "Terms of Use" })).toBeVisible();

  // Footer navigation from the home page.
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

  // Spanish versions.
  await page.goto("/lang/es");
  await page.goto("/privacidad");
  await expect(page.getByRole("heading", { name: "Política de privacidad" })).toBeVisible();
  await page.goto("/terminos");
  await expect(page.getByRole("heading", { name: "Términos de uso" })).toBeVisible();
});
