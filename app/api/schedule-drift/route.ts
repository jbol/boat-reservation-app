import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driftFlags } from "@/lib/scheduleWatch";
import { operatorDataHorizons } from "@/lib/horizon";

/**
 * Public, read-only drift status — consumed by the daily verification routine
 * (and anyone curious). Contains no secrets: just whether an operator's
 * schedule page changed after our last verification, when the tripwire last
 * ran, and how far ahead each operator's sailings data reaches. Empty `flags`
 * = schedules are in sync, nothing to verify. Top-level `dataUntil` is the
 * earliest per-operator horizon — the next "season cliff" date.
 */
export async function GET() {
  const [flags, snapshots, operators, horizons] = await Promise.all([
    driftFlags(),
    prisma.scheduleSnapshot.findMany({ select: { fetchedAt: true } }),
    prisma.operator.findMany({
      where: { scheduleVerified: true },
      select: { id: true, name: true, slug: true, scheduleCheckedAt: true },
    }),
    operatorDataHorizons(prisma),
  ]);
  const byId = new Map(operators.map((o) => [o.id, o]));
  const operatorHorizons = operators.map((o) => horizons.get(o.id) ?? null);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    lastWatchRun:
      snapshots.map((s) => s.fetchedAt.toISOString()).sort().at(-1) ?? null,
    dataUntil: operatorHorizons.every((h) => h !== null)
      ? operatorHorizons.sort()[0]
      : null,
    operators: operators.map((o) => ({
      name: o.name,
      slug: o.slug,
      lastVerifiedAt: o.scheduleCheckedAt,
      dataUntil: horizons.get(o.id) ?? null,
    })),
    flags: flags.map((f) => ({
      operator: byId.get(f.operatorId)?.name ?? f.operatorId,
      slug: byId.get(f.operatorId)?.slug ?? null,
      sourceUrl: f.url,
      pageChangedAt: f.lastChangedAt,
      lastVerifiedAt: byId.get(f.operatorId)?.scheduleCheckedAt ?? null,
    })),
  });
}
