import { describe, it, expect } from "vitest";
import { horizonWarnings } from "./horizon";

const ops = [
  { id: "op-a", name: "A" },
  { id: "op-b", name: "B" },
  { id: "op-c", name: "C" },
  { id: "op-new", name: "New" },
];

describe("horizonWarnings", () => {
  it("is empty when every operator has more than the warn window of data", () => {
    const horizons = new Map([
      ["op-a", "2026-10-31"],
      ["op-b", "2026-10-31"],
      ["op-c", "2026-12-31"],
      ["op-new", "2026-10-31"],
    ]);
    expect(horizonWarnings(ops, horizons, "2026-09-01")).toEqual([]);
  });

  it("flags near and past operators, and treats missing data as past", () => {
    const horizons = new Map([
      ["op-a", "2026-09-30"], // 15 days left → near
      ["op-b", "2026-09-14"], // yesterday → past
      ["op-c", "2026-10-31"], // fine
      // op-new: never materialized
    ]);
    expect(horizonWarnings(ops, horizons, "2026-09-15")).toEqual([
      { operator: ops[0], dataUntil: "2026-09-30", status: "near" },
      { operator: ops[1], dataUntil: "2026-09-14", status: "past" },
      { operator: ops[3], dataUntil: null, status: "past" },
    ]);
  });

  it("keeps the horizon that equals today as near, not past", () => {
    const horizons = new Map([["op-a", "2026-09-30"]]);
    expect(horizonWarnings([ops[0]], horizons, "2026-09-30")).toEqual([
      { operator: ops[0], dataUntil: "2026-09-30", status: "near" },
    ]);
  });
});
