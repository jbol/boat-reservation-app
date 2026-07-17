/**
 * Pure fare/passenger math. Extracted from the server actions so it can be
 * unit-tested without importing "use server" side effects.
 */

export type FareLike = { code: string; priceCents: number };
export type PartyCounts = { adult: number; child: number; infant: number };

/** Coerce a raw form value into a sane passenger count in the range 0–50. */
export function clampCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 50) : 0;
}

export function partySize(counts: PartyCounts): number {
  return counts.adult + counts.child + counts.infant;
}

/** Estimated round-trip total in cents for a party against a route's fares. */
export function estimateCents(fares: FareLike[], counts: PartyCounts): number {
  const price = (code: string) => fares.find((f) => f.code === code)?.priceCents ?? 0;
  return (
    counts.adult * price("adult") +
    counts.child * price("child") +
    counts.infant * price("infant")
  );
}
