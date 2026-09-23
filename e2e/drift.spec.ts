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
    // Data horizon: last dateKey with materialized sailings.
    expect(op.dataUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
  // Top-level dataUntil = the earliest horizon (the next season cliff).
  expect(body.dataUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const horizons = body.operators.map((o: { dataUntil: string }) => o.dataUntil).sort();
  expect(body.dataUntil).toBe(horizons[0]);
});
