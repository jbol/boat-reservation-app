import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deviceOf, isBot, normalizePath, referrerHost, visitorHash } from "@/lib/analytics";
import { madridTodayKey } from "@/lib/format";

/**
 * Receives the page-view beacon. Stores page, device, off-site referrer host
 * and a per-day visitor hash — never the IP, never a cookie. Always answers
 * 204 so a misbehaving beacon can't surface anything to the visitor.
 */
export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return new NextResponse(null, { status: 204 });

  let body: { path?: unknown; from?: unknown; referrer?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const path = typeof body.path === "string" ? normalizePath(body.path) : null;
  if (!path || /^\/(admin|api|go)(\/|$)/.test(path)) {
    return new NextResponse(null, { status: 204 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const secret = process.env.CRON_SECRET ?? process.env.ADMIN_COOKIE_SECRET ?? "dev";
  const ownHosts = [request.headers.get("x-forwarded-host"), request.headers.get("host")];
  const lang = request.cookies.get("lang")?.value;

  await prisma.pageView
    .create({
      data: {
        path,
        fromPort:
          typeof body.from === "string" && /^[a-z-]{1,24}$/.test(body.from) ? body.from : null,
        referrerHost: referrerHost(typeof body.referrer === "string" ? body.referrer : null, ownHosts),
        locale: lang === "en" ? "en" : "es",
        device: deviceOf(userAgent),
        visitorHash: visitorHash(ip, userAgent, madridTodayKey(), secret),
      },
    })
    .catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
