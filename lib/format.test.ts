import { describe, it, expect } from "vitest";
import { euros, shiftDateKey, formatDateKey, isDateKey, madridTodayKey } from "./format";

describe("euros", () => {
  it("drops decimals for whole-euro amounts", () => {
    expect(euros(2400, "es")).toContain("24");
    expect(euros(2400, "es")).not.toContain(",00");
    expect(euros(2400, "en")).not.toContain(".00");
  });

  it("shows decimals for non-whole amounts", () => {
    expect(euros(1250, "en")).toContain("12.50");
  });

  it("renders free fares as zero euros", () => {
    expect(euros(0, "es")).toMatch(/0/);
  });
});

describe("isDateKey", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(isDateKey("2026-07-20")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isDateKey("2026-7-20")).toBe(false);
    expect(isDateKey("20/07/2026")).toBe(false);
    expect(isDateKey("")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
    expect(isDateKey(20260720)).toBe(false);
  });
});

describe("shiftDateKey", () => {
  it("moves forward and backward across month boundaries", () => {
    expect(shiftDateKey("2026-07-31", 1)).toBe("2026-08-01");
    expect(shiftDateKey("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("handles leap-day arithmetic", () => {
    expect(shiftDateKey("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("is a no-op for 0", () => {
    expect(shiftDateKey("2026-07-20", 0)).toBe("2026-07-20");
  });
});

describe("formatDateKey", () => {
  it("localises the same date differently per locale", () => {
    const es = formatDateKey("2026-07-20", "es");
    const en = formatDateKey("2026-07-20", "en");
    expect(es.toLowerCase()).toContain("julio");
    expect(en.toLowerCase()).toContain("july");
  });

  it("is stable regardless of host timezone (uses UTC noon)", () => {
    // 2026-07-20 is a Monday.
    expect(formatDateKey("2026-07-20", "en").toLowerCase()).toContain("monday");
  });
});

describe("madridTodayKey", () => {
  it("returns a valid date key", () => {
    expect(isDateKey(madridTodayKey())).toBe(true);
  });
});
