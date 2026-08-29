import { test, expect } from "@playwright/test";

test("public drift-status endpoint returns sync state", async ({ page }) => {
  const res = await page.request.get("/api/schedule-drift");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(Array.isArray(body.flags)).toBe(true);
  expect(Array.isArray(body.operators)).toBe(true);
  expect(body.operators.length).toBeGreaterThanOrEqual(3);
  // Every verified operator exposes name/slug/lastVerifiedAt, nothing sensitive.
  for (const op of body.operators) {
    expect(op).toHaveProperty("name");
    expect(op).toHaveProperty("slug");
    expect(op).toHaveProperty("lastVerifiedAt");
  }
});
