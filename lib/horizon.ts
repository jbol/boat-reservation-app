import type { PrismaClient } from "@prisma/client";
import { horizonStatus } from "./format";

/**
 * Data horizon = the last dateKey with materialized sailings, per operator.
 * Beyond it we have no schedule loaded for that operator — a different
 * message to customers than "no boats run that day". Counts sailings of any
 * status: a weather-cancelled day still has data.
 */
export async function operatorDataHorizons(db: PrismaClient): Promise<Map<string, string>> {
  const [grouped, routes] = await Promise.all([
    db.sailing.groupBy({ by: ["routeId"], _max: { dateKey: true } }),
    db.route.findMany({ select: { id: true, operatorId: true } }),
  ]);
  const operatorOf = new Map(routes.map((r) => [r.id, r.operatorId]));
  const horizons = new Map<string, string>();
  for (const g of grouped) {
    const operatorId = operatorOf.get(g.routeId);
    const last = g._max.dateKey;
    if (!operatorId || !last) continue;
    const prev = horizons.get(operatorId);
    if (!prev || last > prev) horizons.set(operatorId, last);
  }
  return horizons;
}

export type HorizonWarning<T> = {
  operator: T;
  dataUntil: string | null;
  status: "near" | "past";
};

/** Operators whose loaded data is exhausted or about to be — the admin banner. */
export function horizonWarnings<T extends { id: string }>(
  operators: T[],
  horizons: Map<string, string>,
  todayKey: string,
): HorizonWarning<T>[] {
  return operators.flatMap((operator) => {
    const dataUntil = horizons.get(operator.id) ?? null;
    const status = horizonStatus(dataUntil, todayKey);
    return status === "ok" ? [] : [{ operator, dataUntil, status }];
  });
}
