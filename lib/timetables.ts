import type { Prisma, PrismaClient, Timetable } from "@prisma/client";
import { shiftDateKey } from "./format";

/**
 * Timetables are the editable source of truth for schedules; sailings are
 * materialized from them. The planning half of this module is pure so it can
 * be unit-tested exhaustively; only applyTimetables touches the database.
 *
 * daysMask is 7 chars, Sunday-first (index = Date#getUTCDay), "1" = runs.
 */

export type TimetablePattern = {
  validFrom: string;
  validTo: string;
  daysMask: string;
  times: string[];
};

export function timesOf(t: Pick<Timetable, "times">): string[] {
  return Array.isArray(t.times) ? (t.times as string[]) : [];
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidDaysMask(value: string): boolean {
  return /^[01]{7}$/.test(value);
}

export function dayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

export function* eachDateKey(fromKey: string, toKey: string): Generator<string> {
  for (let key = fromKey; key <= toKey; key = shiftDateKey(key, 1)) {
    yield key;
  }
}

/** All departure times expected on a date, across a route's patterns. */
export function expectedTimesOn(dateKey: string, patterns: TimetablePattern[]): Set<string> {
  const expected = new Set<string>();
  const dow = dayOfWeek(dateKey);
  for (const p of patterns) {
    if (dateKey < p.validFrom || dateKey > p.validTo) continue;
    if (p.daysMask[dow] !== "1") continue;
    for (const time of p.times) expected.add(time);
  }
  return expected;
}

export type ExistingSailing = {
  id: string;
  dateKey: string;
  departureTime: string;
  status: "SCHEDULED" | "CANCELLED";
  activeReservations: number;
};

export type ApplyPlan = {
  toCreate: { dateKey: string; departureTime: string }[];
  /** Obsolete but has active reservations → cancel (and optionally notify). */
  toCancel: ExistingSailing[];
  /** Obsolete with no active reservations → delete outright. */
  toDelete: ExistingSailing[];
  /** Still expected — left untouched (preserves weather cancellations). */
  kept: number;
};

/**
 * Diff expected departures against existing sailings for a window.
 * Sailings outside [fromKey, toKey] are never touched (history stays intact).
 */
export function planApply(
  patterns: TimetablePattern[],
  existing: ExistingSailing[],
  fromKey: string,
  toKey: string,
): ApplyPlan {
  const plan: ApplyPlan = { toCreate: [], toCancel: [], toDelete: [], kept: 0 };

  const existingByKey = new Map<string, ExistingSailing>();
  for (const s of existing) {
    if (s.dateKey < fromKey || s.dateKey > toKey) continue;
    existingByKey.set(`${s.dateKey} ${s.departureTime}`, s);
  }

  for (const dateKey of eachDateKey(fromKey, toKey)) {
    for (const time of expectedTimesOn(dateKey, patterns)) {
      const key = `${dateKey} ${time}`;
      if (existingByKey.has(key)) {
        existingByKey.delete(key);
        plan.kept++;
      } else {
        plan.toCreate.push({ dateKey, departureTime: time });
      }
    }
  }

  // Whatever remains in the map exists but is no longer expected.
  for (const s of existingByKey.values()) {
    if (s.activeReservations > 0 && s.status === "SCHEDULED") plan.toCancel.push(s);
    else if (s.activeReservations > 0) plan.kept++; // already cancelled, keep the record
    else plan.toDelete.push(s);
  }

  return plan;
}

export type ApplyResult = {
  created: number;
  cancelled: number;
  deleted: number;
  kept: number;
  /** Reservation ids on newly-cancelled sailings, for the notify flow. */
  affectedReservationIds: string[];
};

/** Execute a plan for one route. Pass the window explicitly (seed uses the
 * full season; admin applies from today forward). */
export async function applyTimetables(
  db: PrismaClient | Prisma.TransactionClient,
  routeId: string,
  fromKey: string,
  toKey: string,
): Promise<ApplyResult> {
  const timetables = await db.timetable.findMany({ where: { routeId } });
  const patterns: TimetablePattern[] = timetables.map((t) => ({
    validFrom: t.validFrom,
    validTo: t.validTo,
    daysMask: t.daysMask,
    times: timesOf(t),
  }));

  const rows = await db.sailing.findMany({
    where: { routeId, dateKey: { gte: fromKey, lte: toKey } },
    include: {
      _count: {
        select: { reservations: { where: { status: { in: ["INTENT", "CONFIRMED"] } } } },
      },
    },
  });
  const existing: ExistingSailing[] = rows.map((s) => ({
    id: s.id,
    dateKey: s.dateKey,
    departureTime: s.departureTime,
    status: s.status,
    activeReservations: s._count.reservations,
  }));

  const plan = planApply(patterns, existing, fromKey, toKey);

  if (plan.toCreate.length > 0) {
    await db.sailing.createMany({
      data: plan.toCreate.map((c) => ({ routeId, ...c })),
      skipDuplicates: true,
    });
  }

  let affectedReservationIds: string[] = [];
  if (plan.toCancel.length > 0) {
    const ids = plan.toCancel.map((s) => s.id);
    await db.sailing.updateMany({ where: { id: { in: ids } }, data: { status: "CANCELLED" } });
    const affected = await db.reservation.findMany({
      where: { sailingId: { in: ids }, status: { in: ["INTENT", "CONFIRMED"] } },
      select: { id: true },
    });
    affectedReservationIds = affected.map((r) => r.id);
  }

  if (plan.toDelete.length > 0) {
    await db.sailing.deleteMany({ where: { id: { in: plan.toDelete.map((s) => s.id) } } });
  }

  return {
    created: plan.toCreate.length,
    cancelled: plan.toCancel.length,
    deleted: plan.toDelete.length,
    kept: plan.kept,
    affectedReservationIds,
  };
}
