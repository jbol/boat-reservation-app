import { describe, it, expect } from "vitest";
import {
  expectedTimesOn,
  planApply,
  isValidTime,
  isValidDaysMask,
  dayOfWeek,
  type TimetablePattern,
  type ExistingSailing,
} from "./timetables";

// 2026-07-27 is a Monday; masks are Sunday-first (index = getUTCDay).
const MON = "2026-07-27";
const FRI = "2026-07-31";
const SUN = "2026-07-26";

const daily: TimetablePattern = {
  validFrom: "2026-07-01",
  validTo: "2026-09-30",
  daysMask: "1111111",
  times: ["10:00", "12:00"],
};

const fridayOnly: TimetablePattern = {
  validFrom: "2026-07-01",
  validTo: "2026-09-30",
  daysMask: "0000010",
  times: ["20:00"],
};

describe("dayOfWeek / masks", () => {
  it("maps dates to Sunday-first indices", () => {
    expect(dayOfWeek(SUN)).toBe(0);
    expect(dayOfWeek(MON)).toBe(1);
    expect(dayOfWeek(FRI)).toBe(5);
  });

  it("validates times and masks", () => {
    expect(isValidTime("09:45")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:45")).toBe(false);
    expect(isValidDaysMask("1111101")).toBe(true);
    expect(isValidDaysMask("111110")).toBe(false);
    expect(isValidDaysMask("1111102")).toBe(false);
  });
});

describe("expectedTimesOn", () => {
  it("applies weekday masks", () => {
    expect([...expectedTimesOn(MON, [daily, fridayOnly])].sort()).toEqual(["10:00", "12:00"]);
    expect([...expectedTimesOn(FRI, [daily, fridayOnly])].sort()).toEqual([
      "10:00",
      "12:00",
      "20:00",
    ]);
  });

  it("respects validity windows inclusively", () => {
    const windowed: TimetablePattern = { ...daily, validFrom: MON, validTo: MON };
    expect(expectedTimesOn(MON, [windowed]).size).toBe(2);
    expect(expectedTimesOn("2026-07-28", [windowed]).size).toBe(0);
    expect(expectedTimesOn("2026-07-26", [windowed]).size).toBe(0);
  });

  it("unions overlapping patterns without duplicates", () => {
    const dup: TimetablePattern = { ...fridayOnly, times: ["10:00"], daysMask: "1111111" };
    expect(expectedTimesOn(MON, [daily, dup]).size).toBe(2);
  });
});

function sailing(overrides: Partial<ExistingSailing>): ExistingSailing {
  return {
    id: Math.random().toString(36).slice(2),
    dateKey: MON,
    departureTime: "10:00",
    status: "SCHEDULED",
    activeReservations: 0,
    ...overrides,
  };
}

describe("planApply", () => {
  it("creates missing sailings across the window", () => {
    const plan = planApply([daily], [], MON, "2026-07-28");
    expect(plan.toCreate).toHaveLength(4); // 2 times × 2 days
    expect(plan.toCancel).toHaveLength(0);
    expect(plan.toDelete).toHaveLength(0);
  });

  it("keeps matching sailings untouched, including weather-cancelled ones", () => {
    const wx = sailing({ departureTime: "10:00", status: "CANCELLED" });
    const ok = sailing({ departureTime: "12:00" });
    const plan = planApply([daily], [wx, ok], MON, MON);
    expect(plan.kept).toBe(2);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toCancel).toHaveLength(0);
    expect(plan.toDelete).toHaveLength(0);
  });

  it("deletes obsolete sailings without reservations, cancels booked ones", () => {
    const emptyObsolete = sailing({ departureTime: "07:00" });
    const bookedObsolete = sailing({ departureTime: "08:00", activeReservations: 2 });
    const plan = planApply([daily], [emptyObsolete, bookedObsolete], MON, MON);
    expect(plan.toDelete.map((s) => s.departureTime)).toEqual(["07:00"]);
    expect(plan.toCancel.map((s) => s.departureTime)).toEqual(["08:00"]);
  });

  it("keeps already-cancelled obsolete sailings that still hold reservations", () => {
    const cancelledBooked = sailing({
      departureTime: "08:00",
      status: "CANCELLED",
      activeReservations: 1,
    });
    const plan = planApply([daily], [cancelledBooked], MON, MON);
    expect(plan.toCancel).toHaveLength(0);
    expect(plan.toDelete).toHaveLength(0);
    expect(plan.kept).toBe(1); // the cancelled-but-booked record survives
    expect(plan.toCreate).toHaveLength(2); // the expected 10:00/12:00 still get created
  });

  it("never touches sailings outside the window", () => {
    const past = sailing({ dateKey: "2026-07-01", departureTime: "07:00" });
    const plan = planApply([daily], [past], MON, MON);
    expect(plan.toDelete).toHaveLength(0);
    expect(plan.toCancel).toHaveLength(0);
  });

  it("empty patterns plan removal of every unbooked sailing in window", () => {
    const a = sailing({ departureTime: "10:00" });
    const b = sailing({ departureTime: "12:00", activeReservations: 1 });
    const plan = planApply([], [a, b], MON, MON);
    expect(plan.toDelete).toHaveLength(1);
    expect(plan.toCancel).toHaveLength(1);
    expect(plan.toCreate).toHaveLength(0);
  });
});
