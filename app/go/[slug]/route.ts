import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adapterFor } from "@/lib/adapters";
import { cleanParam, clickSource, deviceOf, isBot } from "@/lib/analytics";

/**
 * Every "Comprar" button goes through here: count the click, then forward to
 * the operator's own checkout. The destination comes from the operator record
 * (never from the request), so this can't be used as an open redirect.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const operator = await prisma.operator.findUnique({ where: { slug } });
  if (!operator) notFound();

  const handoff = adapterFor(operator).getHandoff(operator);
  const userAgent = request.headers.get("user-agent");
  if (!isBot(userAgent)) {
    const sp = request.nextUrl.searchParams;
    const lang = request.cookies.get("lang")?.value;
    // Never let bookkeeping stand between a buyer and the checkout.
    await prisma.outboundClick
      .create({
        data: {
          operatorId: operator.id,
          source: clickSource(sp.get("source")),
          dateKey: cleanParam(sp.get("date"), /^\d{4}-\d{2}-\d{2}$/),
          fromPort: cleanParam(sp.get("from"), /^[a-z-]{1,24}$/),
          sailingId: cleanParam(sp.get("sailing"), /^[a-z0-9]{1,40}$/),
          locale: lang === "en" ? "en" : "es",
          device: deviceOf(userAgent),
        },
      })
      .catch(() => undefined);
  }

  const response = NextResponse.redirect(handoff.url, 307);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
