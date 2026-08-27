import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduleWatch } from "@/lib/scheduleWatch";

/**
 * Daily drift tripwire, hit by the Hostinger cron each morning:
 *   curl -fsS "https://tabarcaboats.com/api/cron/schedule-watch?token=$CRON_SECRET"
 * Results land in ScheduleSnapshot; changed pages surface in Admin → Timetables.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const ok =
    !!secret &&
    token.length === secret.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const results = await runScheduleWatch();
  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
