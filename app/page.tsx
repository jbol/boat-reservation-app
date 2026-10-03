import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getDict } from "@/lib/i18n";
import { TabarcaWeatherWidget, WeatherSkeleton } from "./weather";
import {
  formatDateKey,
  isDateKey,
  isScheduleStale,
  madridNowTime,
  madridTodayKey,
  shiftDateKey,
} from "@/lib/format";
import { BoatCardsGrid, buildBoatCards } from "./boatCards";
import { LocationPort } from "./locationPort";
import { operatorDataHorizons } from "@/lib/horizon";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { locale, d } = await getDict();

  const today = madridTodayKey();
  const dateKey = isDateKey(sp.date) ? sp.date : today;

  const ports = await prisma.port.findMany({
    where: { routesFrom: { some: {} } },
    orderBy: { slug: "asc" },
  });
  const from =
    typeof sp.from === "string" && ports.some((p) => p.slug === sp.from) ? sp.from : "";

  const [allSailings, unverifiedOperators, verifiedOperators, horizons] = await Promise.all([
    prisma.sailing.findMany({
      where: { dateKey, status: "SCHEDULED" },
      include: {
        route: { include: { operator: true, originPort: true, fares: true } },
      },
      orderBy: { departureTime: "asc" },
    }),
    prisma.operator.findMany({ where: { scheduleVerified: false } }),
    prisma.operator.findMany({
      where: { scheduleVerified: true },
      include: {
        routes: {
          select: { originPort: { select: { slug: true, nameEs: true, nameEn: true } } },
        },
      },
    }),
    operatorDataHorizons(prisma),
  ]);

  // Boat-first view: one card per operator with that day's out + return times.
  const returnsOnly = from === "tabarca";
  const cards = buildBoatCards(allSailings).filter(
    (c) => returnsOnly || !from || c.route?.originPort.slug === from,
  );
  const nowTime = madridNowTime();
  const isToday = dateKey === today;

  // Operators relevant to the current filter (all of them in returns mode —
  // every boat's last return matters when you're standing on the island).
  const relevantOperators = verifiedOperators.filter(
    (o) =>
      returnsOnly ||
      !from ||
      o.routes.some((r) => r.originPort.slug !== "tabarca" && r.originPort.slug === from),
  );
  // Past an operator's data horizon, absence of sailings means "schedule not
  // published yet", not "no boats that day" — show an honest placeholder.
  const shownOperatorIds = new Set(cards.map((c) => c.operator.id));
  const placeholders = relevantOperators
    .filter((o) => !shownOperatorIds.has(o.id) && dateKey > (horizons.get(o.id) ?? ""))
    .map((o) => ({
      operator: o,
      fromPorts: [
        ...new Set(
          o.routes
            .map((r) => r.originPort)
            .filter((p) => p.slug !== "tabarca")
            .map((p) => (locale === "es" ? p.nameEs : p.nameEn)),
        ),
      ],
    }));
  const pastAllHorizons =
    relevantOperators.length > 0 &&
    relevantOperators.every((o) => dateKey > (horizons.get(o.id) ?? ""));

  const dateHref = (key: string) => `/?date=${key}${from ? `&from=${from}` : ""}`;
  const checkDates = verifiedOperators
    .map((o) => o.scheduleCheckedAt)
    .filter((c): c is Date => c !== null);
  const oldestCheck =
    checkDates.length > 0
      ? checkDates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b))
      : null;
  const checksAreStale = isScheduleStale(oldestCheck);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">{d.tagline}</h1>
        <p className="mt-1 text-slate-600">{d.subTagline}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <form method="GET" action="/" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {d.date}
            <input
              type="date"
              name="date"
              defaultValue={dateKey}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {d.fromLabel}
            {/* key: remount when the filter changes (e.g. location detection),
                since defaultValue only applies on mount. */}
            <select
              key={from}
              name="from"
              defaultValue={from}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            >
              <option value="">{d.allPorts}</option>
              {ports.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {locale === "es" ? p.nameEs : p.nameEn}
                </option>
              ))}
            </select>
          </label>
          <LocationPort
            dateKey={dateKey}
            from={from}
            fromInUrl={sp.from !== undefined}
            locale={locale}
            portNames={Object.fromEntries(
              ports.map((p) => [p.slug, locale === "es" ? p.nameEs : p.nameEn]),
            )}
            labels={{
              use: d.geoUse,
              near: d.geoNear,
              island: d.geoIsland,
              showAll: d.geoShowAll,
            }}
          />
          <button
            type="submit"
            className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
          >
            {d.showBoats}
          </button>
          <nav className="ml-auto flex items-center gap-2 text-sm">
            <Link
              href={dateHref(shiftDateKey(dateKey, -1))}
              className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100"
              aria-label="Previous day"
            >
              ‹
            </Link>
            <Link
              href={dateHref(today)}
              className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100"
            >
              {d.today}
            </Link>
            <Link
              href={dateHref(shiftDateKey(dateKey, 1))}
              className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-100"
              aria-label="Next day"
            >
              ›
            </Link>
          </nav>
        </form>
      </section>

      <Suspense fallback={<WeatherSkeleton />}>
        <TabarcaWeatherWidget />
      </Suspense>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-800">
          {d.sailingsFor} {formatDateKey(dateKey, locale)}
        </h2>
        {oldestCheck && (
          <p className={`mb-3 text-xs ${checksAreStale ? "text-amber-700" : "text-slate-500"}`}>
            {d.verifiedOn}{" "}
            {oldestCheck.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
              day: "numeric",
              month: "long",
            })}
            {checksAreStale ? ` — ${d.staleWarning}` : ""}
          </p>
        )}

        {cards.length + placeholders.length > 0 && (
          <BoatCardsGrid
            cards={cards}
            placeholders={placeholders}
            dateKey={dateKey}
            from={from}
            locale={locale}
            d={d}
            returnsOnly={returnsOnly}
            nowTime={nowTime}
            isToday={isToday}
          />
        )}
        {cards.length === 0 && (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            {pastAllHorizons ? d.noSailingsFuture : d.noSailings}
          </p>
        )}
      </section>

      {unverifiedOperators.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">{d.moreOperators}</h2>
          <ul className="space-y-3">
            {unverifiedOperators.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-dashed border-slate-300 bg-white p-4"
              >
                <p className="font-semibold text-slate-900">{o.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {locale === "es" ? o.blurbEs : o.blurbEn}
                </p>
                <p className="mt-1 text-xs text-slate-500">{d.unverifiedNote}</p>
                <a
                  href={o.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-sky-700 hover:text-sky-900"
                >
                  {d.visitSite} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
