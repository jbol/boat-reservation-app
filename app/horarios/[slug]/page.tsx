import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDict, op } from "@/lib/i18n";
import { timesOf } from "@/lib/timetables";
import {
  euros,
  formatDateKeyShort,
  formatDaysMask,
  isScheduleStale,
} from "@/lib/format";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, d } = await getDict();

  const operator = await prisma.operator.findUnique({
    where: { slug },
    include: {
      routes: {
        include: {
          originPort: true,
          fares: true,
          timetables: { orderBy: [{ validFrom: "asc" }, { id: "asc" }] },
        },
      },
    },
  });
  if (!operator || operator.routes.length === 0) notFound();

  const checkedAt = operator.scheduleCheckedAt;
  const isStale = isScheduleStale(checkedAt);
  const checkedDisplay = checkedAt
    ? checkedAt.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{op(d.scheduleHeading, operator.name)}</h1>
        {(locale === "es" ? operator.blurbEs : operator.blurbEn) && (
          <p className="mt-1 max-w-2xl text-slate-600">
            {locale === "es" ? operator.blurbEs : operator.blurbEn}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">
          {d.verifiedOn} <strong>{checkedDisplay}</strong>
        </span>
        <a
          href={operator.homeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-700 hover:text-sky-900"
        >
          {d.officialSite} ↗
        </a>
      </div>

      {isStale && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {d.staleWarning}
        </p>
      )}

      {operator.routes.map((route) => {
        const origin = locale === "es" ? route.originPort.nameEs : route.originPort.nameEn;
        const destination = locale === "es" ? route.destinationEs : route.destinationEn;
        const returnNote = locale === "es" ? route.returnNoteEs : route.returnNoteEn;
        return (
          <section key={route.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-800">
              {origin} → {destination}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">{d.period}</th>
                    <th className="py-2 pr-3">{d.daysCol}</th>
                    <th className="py-2">{d.timesCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {route.timetables.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDateKeyShort(t.validFrom, locale)} –{" "}
                        {formatDateKeyShort(t.validTo, locale)}
                      </td>
                      <td className="py-2 pr-3">{formatDaysMask(t.daysMask, locale)}</td>
                      <td className="py-2 font-mono tabular-nums">
                        {timesOf(t).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {returnNote && <p className="mt-3 text-sm text-slate-600">{returnNote}</p>}
            {route.fares.length > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                {route.fares
                  .map(
                    (f) =>
                      `${locale === "es" ? f.labelEs : f.labelEn}: ${f.priceCents === 0 ? d.free : euros(f.priceCents, locale)}`,
                  )
                  .join(" · ")}
              </p>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/?from=${operator.routes[0].originPort.slug === "tabarca" ? "" : operator.routes[0].originPort.slug}`}
          className="rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
        >
          {d.seeBoatsFrom}
        </Link>
        <a
          href={operator.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
        >
          {op(d.openSite, operator.name)} ↗
        </a>
      </div>

      <p className="text-xs text-slate-500">{d.scheduleDisclaimer}</p>
    </div>
  );
}
