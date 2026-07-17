import type { Metadata } from "next";
// Self-hosted Geist (via the `geist` package) instead of next/font/google, so
// `next build` never fetches from Google Fonts — hermetic, CI-safe builds.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { getDict } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tabarca Boats — Barcos a la Isla de Tabarca",
  description:
    "Compara horarios y precios de todos los barcos a la Isla de Tabarca (Alicante y Santa Pola) y reserva en los sistemas oficiales de las navieras.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, d } = await getDict();

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-sky-800">
              ⛵ {d.appName}
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/find" className="text-slate-500 hover:text-slate-800">
                {d.navFind}
              </Link>
              <span className="text-slate-300">|</span>
              {/* /lang/[locale] is a route handler (sets the cookie, then redirects),
                  not a page — a full-navigation <a> is intentional here. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/lang/es"
                className={locale === "es" ? "font-bold text-sky-800" : "text-slate-500 hover:text-slate-800"}
              >
                ES
              </a>
              <span className="text-slate-300">|</span>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/lang/en"
                className={locale === "en" ? "font-bold text-sky-800" : "text-slate-500 hover:text-slate-800"}
              >
                EN
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-4 text-xs text-slate-500">
            <p>{d.scheduleDisclaimer}</p>
            <p className="mt-2">
              <Link href="/admin" className="hover:text-slate-700">
                Admin
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
