import { test, expect } from "@playwright/test";
import { SEED_DATE, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

// One flow, one worker: signup → prefilled booking → history → logout → login.
test("account lifecycle: signup, prefilled booking, history, logout, login", async ({ page }) => {
  const email = `account-e2e-${Date.now()}@example.com`;
  const password = "e2e-password-123";

  // Sign up (optional — the site works without this).
  await page.goto("/account");
  const signup = page.locator("form", { has: page.getByRole("button", { name: "Create account" }) });
  await signup.getByLabel("Full name").fill("Account Tester");
  await signup.getByLabel("Email").fill(email);
  await signup.getByLabel("Password").fill(password);
  await signup.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Hi, Account Tester" })).toBeVisible();

  // Booking form is prefilled from the account.
  await page.goto(`/?date=${SEED_DATE}`);
  await page.locator('a[href^="/book/"]').first().click();
  await expect(page.getByLabel("Full name")).toHaveValue("Account Tester");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/r\/.+/);
  await expect(page.getByText("Pending purchase")).toBeVisible();

  // The reservation shows up in the account history.
  await page.goto("/account");
  await expect(page.getByText(SEED_DATE).first()).toBeVisible();
  await expect(page.getByText("Pending purchase").first()).toBeVisible();

  // Log out → the sign-in/signup forms return. Wait for the header to flip
  // to "Sign in" (logout redirect done) before navigating, to avoid racing
  // the server action.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  // Log back in.
  const login = page.locator("form", { has: page.getByRole("button", { name: "Log in" }) });
  await login.getByLabel("Email").fill(email);
  await login.getByLabel("Password").fill(password);
  await login.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Hi, Account Tester" })).toBeVisible();

  // Wrong password is rejected.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await page.goto("/account");
  const login2 = page.locator("form", { has: page.getByRole("button", { name: "Log in" }) });
  await login2.getByLabel("Email").fill(email);
  await login2.getByLabel("Password").fill("not-the-password");
  await login2.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Wrong email or password.")).toBeVisible();
});
