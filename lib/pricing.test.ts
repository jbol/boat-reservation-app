import { describe, it, expect } from "vitest";
import { clampCount, partySize, estimateCents, type FareLike } from "./pricing";

describe("clampCount", () => {
  it("keeps a valid positive integer", () => {
    expect(clampCount("3")).toBe(3);
    expect(clampCount(2)).toBe(2);
  });

  it("floors fractional values", () => {
    expect(clampCount("2.9")).toBe(2);
  });

  it("treats missing / non-numeric / negative as 0", () => {
    expect(clampCount(null)).toBe(0);
    expect(clampCount(undefined)).toBe(0);
    expect(clampCount("")).toBe(0);
    expect(clampCount("abc")).toBe(0);
    expect(clampCount(-4)).toBe(0);
    expect(clampCount(0)).toBe(0);
  });

  it("caps runaway values at 50", () => {
    expect(clampCount("9999")).toBe(50);
  });
});

describe("partySize", () => {
  it("sums all passenger categories", () => {
    expect(partySize({ adult: 2, child: 1, infant: 3 })).toBe(6);
    expect(partySize({ adult: 0, child: 0, infant: 0 })).toBe(0);
  });
});

const fares: FareLike[] = [
  { code: "adult", priceCents: 900 },
  { code: "child", priceCents: 800 },
  { code: "infant", priceCents: 0 },
];

describe("estimateCents", () => {
  it("prices a mixed party", () => {
    expect(estimateCents(fares, { adult: 2, child: 1, infant: 2 })).toBe(2 * 900 + 800);
  });

  it("returns 0 for an empty party", () => {
    expect(estimateCents(fares, { adult: 0, child: 0, infant: 0 })).toBe(0);
  });

  it("treats an unknown/missing fare code as free rather than NaN", () => {
    expect(estimateCents([{ code: "adult", priceCents: 2400 }], { adult: 1, child: 5, infant: 0 })).toBe(2400);
  });
});
