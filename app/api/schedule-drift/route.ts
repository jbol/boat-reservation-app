import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driftFlags } from "@/lib/scheduleWatch";

/**
 * Public, read-only drift status — consumed by the daily verification routine
 * (and anyone curious). Contains no secrets: just whether an operator's
 * schedule page changed after our last verification, and when the tripwire
 * last ran. Empty `flags` = schedules are in sync, nothing to verify.
 */
export async function GET() {
  const [flags, snapshots, operators] = await Promise.all([
    driftFlags(),
    prisma.scheduleSnapshot.findMany({ select: { fetchedAt: true } }),
    prisma.operator.findMany({
      where: { scheduleVerified: true },
      select: { id: true, name: true, slug: true, scheduleCheckedAt: true },
    }),
  ]);
  const byId = new Map(operators.map((o) => [o.id, o]));

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    lastWatchRun:
      snapshots.map((s) => s.fetchedAt.toISOString()).sort().at(-1) ?? null,
    operators: operators.map((o) => ({
      name: o.name,
      slug: o.slug,
      lastVerifiedAt: o.scheduleCheckedAt,
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
