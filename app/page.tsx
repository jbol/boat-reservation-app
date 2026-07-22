import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDict } from "@/lib/i18n";
import { euros, formatDateKey, isDateKey, madridTodayKey, shiftDateKey } from "@/lib/format";

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

  const [sailings, unverifiedOperators] = await Promise.all([
    prisma.sailing.findMany({
      where: {
        dateKey,
        status: "SCHEDULED",
        ...(from ? { route: { originPort: { slug: from } } } : {}),
      },
      include: {
        route: { include: { operator: true, originPort: true, fares: true } },
      },
      orderBy: { departureTime: "asc" },
    }),
    prisma.operator.findMany({ where: { scheduleVerified: false } }),
  ]);

  const dateHref = (key: string) => `/?date=${key}${from ? `&from=${from}` : ""}`;

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
            <select
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          {d.sailingsFor} {formatDateKey(dateKey, locale)}
        </h2>

        {sailings.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            {d.noSailings}
          </p>
        ) : (
          <ul className="space-y-3">
            {sailings.map((s) => {
              const route = s.route;
              const adultFare = route.fares.find((f) => f.code === "adult");
              const portName = locale === "es" ? route.originPort.nameEs : route.originPort.nameEn;
              const durationNote =
                locale === "es" ? route.durationNoteEs : route.durationNoteEn;
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="w-16 text-2xl font-bold tabular-nums text-slate-900">
                    {s.departureTime}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{route.operator.name}</p>
                    <p className="text-sm text-slate-600">
                      {d.fromPort} {portName} · {d.approxDuration} {route.durationMin} min
                      {durationNote ? ` (${durationNote})` : ""} ·{" "}
                      {route.openReturn ? d.openReturn : d.dayTrip}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {adultFare && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">
                          {euros(adultFare.priceCents, locale)}
                        </p>
                        <p className="text-xs text-slate-500">{d.perAdult}</p>
                      </div>
                    )}
                    <Link
                      href={`/book/${s.id}`}
                      className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
                    >
                      {d.book}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
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
