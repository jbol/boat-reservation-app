import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDict, op } from "@/lib/i18n";
import { getSessionCustomer } from "@/lib/customerAuth";
import { createReservation } from "@/lib/actions";
import { adapterFor } from "@/lib/adapters";
import { euros, formatDateKey } from "@/lib/format";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ sailingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sailingId } = await params;
  const sp = await searchParams;
  const { locale, d } = await getDict();
  // Optional account: prefill for logged-in customers; guests see empty fields.
  const sessionCustomer = await getSessionCustomer();

  const sailing = await prisma.sailing.findUnique({
    where: { id: sailingId },
    include: {
      route: { include: { operator: true, originPort: true, fares: true } },
    },
  });
  // Return crossings from Tabarca are informational — not bookable.
  if (!sailing || sailing.status !== "SCHEDULED" || sailing.route.originPort.slug === "tabarca")
    notFound();

  const route = sailing.route;
  const operator = route.operator;
  const handoff = adapterFor(operator).getHandoff(operator);
  const portName = locale === "es" ? route.originPort.nameEs : route.originPort.nameEn;
  const returnNote = locale === "es" ? route.returnNoteEs : route.returnNoteEn;
  const fareSummary = route.fares
    .map(
      (f) =>
        `${locale === "es" ? f.labelEs : f.labelEn}: ${f.priceCents === 0 ? d.free : euros(f.priceCents, locale)}`,
    )
    .join(" · ");
  // The save form is collapsed for guests; open it when there is something to
  // show (a prefilled account, or a validation error to fix).
  const saveOpen = Boolean(sp.error) || Boolean(sessionCustomer);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">{d.bookTitle}</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-lg font-semibold">
          {formatDateKey(sailing.dateKey, locale)} · {sailing.departureTime}
        </p>
        <p className="text-slate-600">
          {operator.name} · {d.fromPort} {portName} · {d.approxDuration} {route.durationMin} min
        </p>
        {returnNote && (
          <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-600">
            <span className="font-medium">{d.returnHeading}:</span> {returnNote}
          </p>
        )}
      </section>

      {/* Quick buy: the primary action is one click to the operator's checkout. */}
      <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
        {fareSummary && <p className="text-sm text-slate-700">{fareSummary}</p>}
        <a
          href={handoff.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg bg-sky-700 px-4 py-3 text-center text-lg font-semibold text-white hover:bg-sky-800"
        >
          {op(d.openSite, operator.name)} ↗
        </a>
        <p className="text-xs text-slate-600">{op(d.opensNewTab, operator.name)}</p>
      </section>

      {sp.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {locale === "es"
            ? "Revisa los datos: falta el nombre, el email o los pasajeros."
            : "Please check the form: name, email or passengers are missing."}
        </p>
      )}

      <details open={saveOpen} className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-slate-800">
          {d.saveTripTitle}
        </summary>
        <div className="space-y-4 border-t border-slate-100 p-4">
          <p className="text-sm text-slate-600">{d.saveTripHint}</p>

          <form action={createReservation} className="space-y-5">
            <input type="hidden" name="sailingId" value={sailing.id} />
            <input type="hidden" name="locale" value={locale} />

            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold">{d.passengers}</legend>
              <div className="space-y-3">
                {route.fares.map((fare) => (
                  <label
                    key={fare.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>
                      <span className="font-medium text-slate-800">
                        {locale === "es" ? fare.labelEs : fare.labelEn}
                      </span>{" "}
                      <span className="text-slate-500">
                        — {fare.priceCents === 0 ? d.free : euros(fare.priceCents, locale)}
                        {(locale === "es" ? fare.noteEs : fare.noteEn)
                          ? ` (${locale === "es" ? fare.noteEs : fare.noteEn})`
                          : ""}
                      </span>
                    </span>
                    <input
                      type="number"
                      name={`count_${fare.code}`}
                      min={0}
                      max={50}
                      defaultValue={fare.code === "adult" ? 1 : 0}
                      className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-base"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold">{d.yourDetails}</legend>
              <label className="block text-sm font-medium text-slate-700">
                {d.nameLabel}
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={sessionCustomer?.name ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {d.emailLabel}
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={sessionCustomer?.email ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {d.phoneLabel}
                <input
                  type="tel"
                  name="phone"
                  defaultValue={sessionCustomer?.phone ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                />
              </label>
            </fieldset>

            <p className="text-sm text-slate-600">{op(d.payNote, operator.name)}</p>
            <p className="text-xs text-slate-500">
              {d.byAccepting}{" "}
              <Link href="/privacidad" className="text-sky-700 hover:underline">
                {d.privacyPolicyLinkText}
              </Link>
              .
            </p>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-800"
            >
              {d.saveTrip}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
