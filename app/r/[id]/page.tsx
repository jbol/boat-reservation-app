import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDict, op } from "@/lib/i18n";
import { adapterFor } from "@/lib/adapters";
import { attachBookingRef, cancelReservation } from "@/lib/actions";
import { euros, formatDateKey } from "@/lib/format";

const statusStyles: Record<string, string> = {
  INTENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, d } = await getDict();

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      customer: true,
      sailing: {
        include: {
          route: { include: { operator: true, originPort: true } },
        },
      },
    },
  });
  if (!reservation) notFound();

  const { sailing } = reservation;
  const route = sailing.route;
  const operator = route.operator;
  const handoff = adapterFor(operator).getHandoff(operator);
  const portName = locale === "es" ? route.originPort.nameEs : route.originPort.nameEn;
  const returnNote = locale === "es" ? route.returnNoteEs : route.returnNoteEn;
  const statusLabel = d[`status${reservation.status}` as keyof typeof d] as string;

  const party = [
    reservation.adults > 0 ? `${d.adults}: ${reservation.adults}` : null,
    reservation.children > 0 ? `${d.children}: ${reservation.children}` : null,
    reservation.infants > 0 ? `${d.infants}: ${reservation.infants}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{d.resTitle}</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              {formatDateKey(sailing.dateKey, locale)} · {sailing.departureTime}
            </p>
            <p className="text-slate-600">
              {operator.name} · {d.fromPort} {portName}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[reservation.status]}`}
          >
            {statusLabel}
          </span>
        </div>
        <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-700">
          <div className="flex justify-between">
            <dt>{reservation.customer.name}</dt>
            <dd className="text-slate-500">{reservation.customer.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{party}</dt>
            {reservation.estTotalCents != null && (
              <dd>
                {d.estTotal}: <strong>{euros(reservation.estTotalCents, locale)}</strong>
              </dd>
            )}
          </div>
          {reservation.externalRef && (
            <div className="flex justify-between">
              <dt>{d.reference}</dt>
              <dd className="font-mono font-semibold">{reservation.externalRef}</dd>
            </div>
          )}
        </dl>
      </section>

      {sailing.status === "CANCELLED" && reservation.status !== "CANCELLED" && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">{d.sailingCancelledBanner}</p>
          <Link
            href={`/?date=${sailing.dateKey}`}
            className="mt-3 inline-block rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
          >
            {d.findAnotherBoat}
          </Link>
        </section>
      )}

      {reservation.status === "INTENT" && sailing.status !== "CANCELLED" && (
        <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold text-amber-900">{d.oneStepLeft}</h2>
          <ol className="list-decimal space-y-4 pl-5 text-sm text-amber-900">
            <li>
              <p>{op(d.step1, operator.name)}</p>
              <a
                href={handoff.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800"
              >
                {op(d.openSite, operator.name)} ↗
              </a>
            </li>
            <li>
              <p>{d.step2}</p>
              <form action={attachBookingRef} className="mt-2 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={reservation.id} />
                <input
                  type="text"
                  name="externalRef"
                  required
                  placeholder={d.refPlaceholder}
                  aria-label={d.refLabel}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                >
                  {d.saveRef}
                </button>
              </form>
            </li>
          </ol>
        </section>
      )}

      {reservation.status === "CONFIRMED" && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <p className="font-semibold">{op(d.confirmedThanks, operator.name)}</p>
          {returnNote && <p className="mt-2 text-sm">{returnNote}</p>}
        </section>
      )}

      {reservation.status === "CANCELLED" && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{d.cancelledMsg}</p>
        </section>
      )}

      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="text-sky-700 hover:text-sky-900">
          {d.backHome}
        </Link>
        {(reservation.status === "INTENT" || reservation.status === "CONFIRMED") && (
          <form action={cancelReservation}>
            <input type="hidden" name="id" value={reservation.id} />
            <button type="submit" className="text-red-600 hover:text-red-800">
              {d.cancelIntent}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
