import { NextRequest, NextResponse } from "next/server";
import { backPath } from "@/lib/langRedirect";

function configuredHost(): string | null {
  try {
    return new URL(process.env.APP_BASE_URL ?? "").host;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const lang = locale === "en" ? "en" : "es";

  // Go back where the visitor was, but never off-site.
  const target = backPath(request.headers.get("referer"), [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    configuredHost(),
  ]);

  // A relative Location: the browser resolves it against the address it
  // actually used. Do not build this from request.url — behind the hosting
  // proxy that is the server's internal bind address.
  const response = new NextResponse(null, { status: 307, headers: { Location: target } });
  response.cookies.set("lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
