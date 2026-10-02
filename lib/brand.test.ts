import { describe, it, expect } from "vitest";
import { BRAND_COLORS, NEUTRAL_BORDER, brandOf, contrastRatio, onColor } from "./brand";

describe("contrastRatio", () => {
  it("spans 1 (same colour) to 21 (black on white), in either order", () => {
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
  });
});

describe("onColor", () => {
  it("puts white lettering on dark fills and ink on light ones", () => {
    expect(onColor("#11395f")).toBe("#ffffff"); // navy
    expect(onColor("#d32f2f")).toBe("#ffffff"); // red
    expect(onColor("#ff6600")).toBe("#0f172a"); // orange: white would be ~2.9:1
    expect(onColor("#e8ab14")).toBe("#0f172a"); // gold: white would be ~2:1
  });
});

describe("brandOf", () => {
  it("gives every operator a title that meets WCAG AA on its band", () => {
    for (const slug of Object.keys(BRAND_COLORS)) {
      const { color, on } = brandOf(slug);
      expect(contrastRatio(color, on), slug).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to a neutral band with legible lettering", () => {
    const unknown = brandOf("some-future-operator");
    expect(unknown.color).toBe(NEUTRAL_BORDER);
    expect(contrastRatio(unknown.color, unknown.on)).toBeGreaterThanOrEqual(4.5);
  });
});
