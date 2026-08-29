import Link from "next/link";
import type { FareType, Operator, Port, Route, Sailing } from "@prisma/client";
import type { Dict, Locale } from "@/lib/i18n";
import { euros } from "@/lib/format";

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
  // Fixed display order (user preference): Transtabarca and Kontiki on the
  // first row, Marítimas Torrevieja below; any future operator sorts after,
  // by its first departure of the day.
  const CARD_ORDER = ["transtabarca", "kontiki", "maritimas-torrevieja"];
  const rank = (card: BoatCard) => {
    const i = CARD_ORDER.indexOf(card.operator.slug);
    return i === -1 ? CARD_ORDER.length : i;
  };
  return [...byOperator.values()].sort(
    (a, b) =>
      rank(a) - rank(b) ||
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
            className="rounded-lg bg-sky-700 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-white hover:bg-sky-800"
          >
            {s.departureTime}
          </Link>
        );
      })}
    </div>
  );
}

export function BoatCardsGrid({
  cards,
  locale,
  d,
  returnsOnly,
  nowTime,
  isToday,
}: {
  cards: BoatCard[];
  locale: Locale;
  d: Dict;
  /** "Desde: Isla de Tabarca" mode — emphasize returns, nothing bookable. */
  returnsOnly: boolean;
  nowTime: string;
  isToday: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const route = card.route;
        const adultFare = route?.fares.find((f) => f.code === "adult");
        const portName = route
          ? locale === "es"
            ? route.originPort.nameEs
            : route.originPort.nameEn
          : "";
        return (
          <section
            key={card.operator.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900">
                  <Link
                    href={`/horarios/${card.operator.slug}`}
                    className="hover:text-sky-800 hover:underline"
                    title={d.seeSchedule}
                  >
                    {card.operator.name}
                  </Link>
                </h3>
                {route && (
                  <p className="text-xs text-slate-500">
                    {d.fromPort} {portName} · {route.durationMin} min ·{" "}
                    {route.openReturn ? d.openReturn : d.dayTrip}
                  </p>
                )}
              </div>
              {adultFare && !returnsOnly && (
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {euros(adultFare.priceCents, locale)}
                  </p>
                  <p className="text-[10px] text-slate-500">{d.perAdult}</p>
                </div>
              )}
            </div>

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

            <p className="mt-auto text-[11px] text-slate-400">
              {returnsOnly ? d.returnIncluded : d.chooseTime}
            </p>
          </section>
        );
      })}
    </div>
  );
}
