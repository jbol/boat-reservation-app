import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const lang = locale === "en" ? "en" : "es";

  // Go back where the user was, but never off-site.
  const referer = request.headers.get("referer");
  let back = new URL("/", request.url);
  if (referer) {
    const url = new URL(referer, request.url);
    if (url.origin === new URL(request.url).origin) back = url;
  }

  const response = NextResponse.redirect(back);
  response.cookies.set("lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
