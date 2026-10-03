import Link from "next/link";
import type { FareType, Operator, Port, Route, Sailing } from "@prisma/client";
import { op, type Dict, type Locale } from "@/lib/i18n";
import { adapterFor } from "@/lib/adapters";
import { brandColor, brandOf } from "@/lib/brand";
import { euros, isScheduleStale } from "@/lib/format";

export type SailingWithRoute = Sailing & {
  route: Route & { operator: Operator; originPort: Port; fares: FareType[] };
};

export type BoatCard = {
  operator: Operator;
  /** Outbound route (mainland → Tabarca); null when the operator only has returns that day. */
  route: (Route & { originPort: Port; fares: FareType[] }) | null;
  out: SailingWithRoute[];
  back: SailingWithRoute[];
};

// Fixed display order. Two owner rules: Santa Pola boats first, and similar
// outline colours never next to each other — so navy Transtabarca sits
// between the two orange boats, and gold Marítimas separates coral from the
// red Kontiki. Any future operator sorts after, by first departure.
const CARD_ORDER = [
  "tabarkeras", // orange
  "transtabarca", // navy
  "viajes-isla-tabarca", // coral
  "maritimas-torrevieja", // gold
  "kontiki", // red
];

function operatorRank(slug: string): number {
  const i = CARD_ORDER.indexOf(slug);
  return i === -1 ? CARD_ORDER.length : i;
}

/** Group a day's sailings (both directions) into one card per operator/boat. */
export function buildBoatCards(sailings: SailingWithRoute[]): BoatCard[] {
  const byOperator = new Map<string, BoatCard>();
  for (const s of sailings) {
    const op = s.route.operator;
    let card = byOperator.get(op.id);
    if (!card) {
      card = { operator: op, route: null, out: [], back: [] };
      byOperator.set(op.id, card);
    }
    if (s.route.originPort.slug === "tabarca") {
      card.back.push(s);
    } else {
      card.out.push(s);
      card.route ??= s.route;
    }
  }
  return [...byOperator.values()].sort(
    (a, b) =>
      operatorRank(a.operator.slug) - operatorRank(b.operator.slug) ||
      (a.out[0]?.departureTime ?? "99").localeCompare(b.out[0]?.departureTime ?? "99"),
  );
}

function TimeChips({
  sailings,
  bookable,
  nowTime,
  isToday,
}: {
  sailings: SailingWithRoute[];
  bookable: boolean;
  nowTime: string;
  isToday: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sailings.map((s) => {
        const departed = isToday && s.departureTime <= nowTime;
        if (departed || !bookable) {
          return (
            <span
              key={s.id}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold tabular-nums ${
                departed
                  ? "bg-slate-100 text-slate-400 line-through"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {s.departureTime}
            </span>
          );
        }
        return (
          <Link
            key={s.id}
            href={`/book/${s.id}`}
            prefetch={false}
            className="rounded-lg bg-sky-700 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-white hover:bg-sky-800"
          >
            {s.departureTime}
          </Link>
        );
      })}
    </div>
  );
}

/** A verified operator with no loaded data for the selected date. */
export type SchedulePlaceholder = {
  operator: Operator;
  /** Localized mainland origin port names (empty for return-only operators). */
  fromPorts: string[];
};

/** Muted card for a verified operator whose schedule isn't loaded for the
 *  selected date — an honest "not yet" instead of silently missing. */
function NotYetPublishedCard({
  placeholder: { operator, fromPorts },
  d,
}: {
  placeholder: SchedulePlaceholder;
  d: Dict;
}) {
  return (
    <section
      className="flex flex-col gap-2 rounded-xl border-2 border-dashed bg-white p-4"
      style={{ borderColor: brandColor(operator.slug) }}
    >
      <div>
        <h3 className="font-bold text-slate-700">
          <Link
            href={`/horarios/${operator.slug}`}
            prefetch={false}
            className="hover:text-sky-800 hover:underline"
            title={d.seeSchedule}
          >
            {operator.name}
          </Link>
        </h3>
        {fromPorts.length > 0 && (
          <p className="text-xs text-slate-500">
            {d.fromPort} {fromPorts.join(" · ")}
          </p>
        )}
      </div>
      <p className="text-sm font-medium text-slate-600">📅 {d.notYetPublished}</p>
      <p className="text-xs text-slate-400">{d.notYetPublishedHint}</p>
    </section>
  );
}

export function BoatCardsGrid({
  cards,
  placeholders = [],
  locale,
  d,
  returnsOnly,
  nowTime,
  isToday,
}: {
  cards: BoatCard[];
  /** Verified operators with no data for the date because it's past their horizon. */
  placeholders?: SchedulePlaceholder[];
  locale: Locale;
  d: Dict;
  /** "Desde: Isla de Tabarca" mode — emphasize returns, nothing bookable. */
  returnsOnly: boolean;
  nowTime: string;
  isToday: boolean;
}) {
  // Bookable cards first (in pinned order), then placeholders (same order) —
  // a "not yet" notice must never push the only real boat below the fold.
  const entries: (
    | { kind: "card"; card: BoatCard }
    | { kind: "placeholder"; placeholder: SchedulePlaceholder }
  )[] = [
    ...cards.map((card) => ({ kind: "card" as const, card })),
    ...placeholders.map((placeholder) => ({ kind: "placeholder" as const, placeholder })),
  ].sort((a, b) => {
    const slugOf = (e: typeof a) =>
      e.kind === "card" ? e.card.operator.slug : e.placeholder.operator.slug;
    return (
      Number(a.kind === "placeholder") - Number(b.kind === "placeholder") ||
      operatorRank(slugOf(a)) - operatorRank(slugOf(b))
    );
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => {
        if (entry.kind === "placeholder") {
          return (
            <NotYetPublishedCard
              key={entry.placeholder.operator.id}
              placeholder={entry.placeholder}
              d={d}
            />
          );
        }
        const card = entry.card;
        const route = card.route;
        const adultFare = route?.fares.find((f) => f.code === "adult");
        const portName = route
          ? locale === "es"
            ? route.originPort.nameEs
            : route.originPort.nameEn
          : "";
        const brand = brandOf(card.operator.slug);
        return (
          <section
            key={card.operator.id}
            className="flex flex-col overflow-hidden rounded-xl border-2 bg-white"
            style={{ borderColor: brand.color }}
          >
            {/* Header band in the boat's colour; lettering is white or ink,
                whichever contrasts more (lib/brand, AA-tested). */}
            {/* One fixed shape for every boat, so all bands are the same height
                whatever the name length: a single-line name, the details on
                their own full-width line(s), then the price row. Nothing
                competes for width, so nothing wraps unevenly or gets cut. */}
            <div
              data-band
              className="px-4 py-3"
              style={{ backgroundColor: brand.color, color: brand.on }}
            >
              <h3 className="truncate font-bold">
                <Link
                  href={`/horarios/${card.operator.slug}`}
                  prefetch={false}
                  className="hover:underline"
                  title={d.seeSchedule}
                >
                  {card.operator.name}
                </Link>
              </h3>
              {/* Two lines in the narrow three-column layout; reserve them so
                  a shorter port name can't make one band shorter. */}
              <p className="line-clamp-2 text-xs lg:min-h-8">
                {/* Returns-only view (standing on the island): say where the boat goes. */}
                {returnsOnly
                  ? card.back[0] && (
                      <>
                        →{" "}
                        {locale === "es"
                          ? card.back[0].route.destinationEs
                          : card.back[0].route.destinationEn}{" "}
                        · {card.back[0].route.durationMin} min
                      </>
                    )
                  : route && (
                      <>
                        {d.fromPort} {portName} · {route.durationMin} min ·{" "}
                        {route.openReturn ? d.openReturn : d.dayTrip}
                      </>
                    )}
              </p>
              {adultFare && !returnsOnly && (
                <p className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-[11px]">{d.perAdult}</span>
                  <span className="text-lg leading-6 font-bold">
                    {euros(adultFare.priceCents, locale)}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
            {card.operator.scheduleCheckedAt && (
              <p
                className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-medium ${
                  isScheduleStale(card.operator.scheduleCheckedAt)
                    ? "bg-amber-50 text-amber-800"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                ✓ {d.updatedOn}{" "}
                {card.operator.scheduleCheckedAt.toLocaleDateString(
                  locale === "es" ? "es-ES" : "en-GB",
                  { day: "numeric", month: "long" },
                )}
              </p>
            )}

            {!returnsOnly && card.out.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.outboundLabel}
                </p>
                <TimeChips sailings={card.out} bookable nowTime={nowTime} isToday={isToday} />
              </div>
            )}

            {card.back.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {d.returnLabel}
                </p>
                <TimeChips
                  sailings={card.back}
                  bookable={false}
                  nowTime={nowTime}
                  isToday={isToday}
                />
              </div>
            )}

            {card.back.length > 0 &&
              (() => {
                const last = card.back[card.back.length - 1];
                const gone = isToday && last.departureTime <= nowTime;
                return (
                  <p
                    className={`mt-auto rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                      gone
                        ? "border-red-300 bg-red-100 text-red-700"
                        : "border-rose-200 bg-rose-50 text-rose-900"
                    }`}
                  >
                    ⏱ {d.lastBoatBack}:{" "}
                    <strong className="tabular-nums">{last.departureTime}</strong>
                    {gone ? ` — ${d.departed}` : ""}
                  </p>
                );
              })()}
            {/* Quick buy: one click to the operator's own checkout. The label
                is the same short line on every card so the buttons match (the
                band already names the operator); saving a trip stays optional
                via the time chips. */}
            {!returnsOnly && route && (
              <a
                href={adapterFor(card.operator).getHandoff(card.operator).url}
                target="_blank"
                rel="noopener noreferrer"
                title={op(d.openSite, card.operator.name)}
                className="block rounded-lg px-4 py-2.5 text-center font-semibold whitespace-nowrap hover:brightness-95"
                style={{ backgroundColor: brand.color, color: brand.on }}
              >
                {d.buyTickets} ↗
              </a>
            )}
            <p className="text-[11px] text-slate-400">
              {returnsOnly ? d.returnIncluded : d.chooseTime}
            </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
