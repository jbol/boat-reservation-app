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

describe("formatDaysMask", () => {
  it("renders the full week as a phrase", async () => {
    const { formatDaysMask } = await import("./format");
    expect(formatDaysMask("1111111", "es")).toBe("todos los días");
    expect(formatDaysMask("1111111", "en")).toBe("every day");
  });

  it("lists days Monday-first from a Sunday-first mask", async () => {
    const { formatDaysMask } = await import("./format");
    expect(formatDaysMask("0000010", "en")).toBe("Fri");
    expect(formatDaysMask("1111101", "en")).toBe("Mon, Tue, Wed, Thu, Sat, Sun");
    expect(formatDaysMask("1000001", "es")).toBe("sáb, dom");
  });
});

describe("formatDateKeyShort", () => {
  it("is compact and localized", async () => {
    const { formatDateKeyShort } = await import("./format");
    expect(formatDateKeyShort("2026-07-04", "en").toLowerCase()).toContain("jul");
    expect(formatDateKeyShort("2026-07-04", "es")).toContain("4");
  });
});

describe("dateKeyDiffDays", () => {
  it("counts forward, backward, and across DST changes", async () => {
    const { dateKeyDiffDays } = await import("./format");
    expect(dateKeyDiffDays("2026-09-01", "2026-09-30")).toBe(29);
    expect(dateKeyDiffDays("2026-09-30", "2026-09-01")).toBe(-29);
    expect(dateKeyDiffDays("2026-07-20", "2026-07-20")).toBe(0);
    // Spain leaves DST on 2026-10-25 — day math must not drift.
    expect(dateKeyDiffDays("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("horizonStatus", () => {
  it("flags missing or exhausted data as past", async () => {
    const { horizonStatus } = await import("./format");
    expect(horizonStatus(null, "2026-09-01")).toBe("past");
    expect(horizonStatus(undefined, "2026-09-01")).toBe("past");
    expect(horizonStatus("2026-08-31", "2026-09-01")).toBe("past");
  });

  it("warns inside the window, ok outside, with exact boundaries", async () => {
    const { horizonStatus, HORIZON_WARN_DAYS } = await import("./format");
    expect(HORIZON_WARN_DAYS).toBe(21);
    // Horizon = today still counts as data present, but nearly gone.
    expect(horizonStatus("2026-09-01", "2026-09-01")).toBe("near");
    expect(horizonStatus("2026-09-22", "2026-09-01")).toBe("near"); // 21 days: inclusive
    expect(horizonStatus("2026-09-23", "2026-09-01")).toBe("ok"); // 22 days
    expect(horizonStatus("2026-10-31", "2026-09-01")).toBe("ok");
  });
});

describe("madridTodayKey", () => {
  it("returns a valid date key", () => {
    expect(isDateKey(madridTodayKey())).toBe(true);
  });
});
