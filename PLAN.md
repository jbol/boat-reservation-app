# Plan — Tabarca Boat Reservation App

_Last updated: 2026-07-04 (operator research done on this date)_

## 1. What we're building

A reservation app for boat trips to **Isla de Tabarca** that:

- shows all sailings to Tabarca across operators and departure ports in one place (date → compare times, prices, duration, port);
- lets users **book through the operators' existing systems** rather than replacing them;
- gives an admin (you) a dashboard to manage and track reservations made through the app.

The key constraint discovered in research: **none of the direct operators publish a public API or affiliate program**, so the integration strategy has to be tiered — start with clean hand-offs, upgrade to real integrations per operator as partnerships allow.

## 2. Operator landscape (researched July 2026)

| Operator | Departs from | Website | Booking tech (observed) | Integration angle |
|---|---|---|---|---|
| Cruceros Kontiki | Alicante | [cruceroskontiki.com](https://cruceroskontiki.com/en/) | WordPress + WooCommerce (Elementor, `/carrito/` cart) | Deep link now; WooCommerce REST API is technically available **if** they issue keys (partnership) |
| Tabarkeras | Santa Pola | [tabarkeras.com](https://tabarkeras.com/) | WordPress + event-ticketing plugin (`/event/ticket-tabarkeras/`) | Deep link; open tickets ("buy today, use any day") simplify hand-off |
| Transtabarca | Santa Pola | [islatabarca.com](https://www.islatabarca.com/) | TBD (verify) | Deep link |
| Viajes Isla Tabarca | Santa Pola | [viajesislatabarca.com](https://viajesislatabarca.com/) | TBD (verify) | Deep link |
| Tabarca Experience | Santa Pola | [tabarcaexperience.com](https://tabarcaexperience.com/) | TBD — already bundles ferry + restaurant + excursions in one checkout | Deep link; possible partner/inspiration |

Reference facts gathered:

- **Kontiki (Alicante):** ~€24 round trip, kids 0–4 free, open-return tickets, 3 catamarans (2 with underwater vision), operating since 1966. Online flow: pick date/time → pay → download tickets. Also sells boat+meal packages, snorkel tours (partner: Tabarca Snorkel), group trips.
- **Tabarkeras (Santa Pola):** ~22–25 min crossing, up to 16 daily departures 9:00–19:00 outbound / 12 return departures in season, two 250-pax catamarans.
- **Santa Pola ↔ Tabarca** in general: ~3 nautical miles, 20–30 min, departures every ~30 min in high season, €9–25 round trip depending on operator/season.
- **Aggregators already sell these trips:** [Civitatis](https://www.civitatis.com/en/alicante/tabarca-island-ferry/) lists the Alicante–Tabarca ferry (Civitatis has an affiliate program), and GetYourGuide/Viator-style platforms have partner APIs. This is the most realistic path to *structured, commissionable* availability without a direct operator deal.

## 3. Integration strategy (tiered)

The phrase "connect to existing boat websites" maps to four tiers, from zero-permission to full partnership:

### Tier 1 — Deep-link hand-off (MVP, no permission needed)
We maintain schedule/price data ourselves (seeded manually from operator sites, refreshed with light checks). User picks a sailing → clicks **"Book with Kontiki"** → lands on the operator's own checkout. We record a **reservation intent** and close the loop by letting the user attach their booking reference / confirmation afterwards (or mark it manually in the admin).

- ✅ Legal, robust, works for every operator on day one.
- ❌ Availability isn't live; confirmation is manual.

### Tier 2 — Affiliate APIs via aggregators (structured availability + commission)
Integrate GetYourGuide Partner API and/or Civitatis affiliate program for the Tabarca products they already carry. Gives real availability, an actual booking flow we can embed/deep-link with tracking, and revenue per booking.

### Tier 3 — Direct operator integration (partnership required)
Approach operators one by one. Kontiki is the best first target: they're on **WooCommerce**, which ships a REST API (products, orders, webhooks) — they'd only need to issue API keys or install a bookings plugin with webhooks. Per-operator adapter handles the specifics.

### Tier 4 — Own inventory (become the booking system)
For any operator without decent online booking who wants one: we hold their inventory, run checkout (Stripe), and they get a manifest view. Full reservation lifecycle in our system.

### Explicit non-goal
**No scraping-driven automated booking** into operator checkouts (bot-filling their WooCommerce cart, etc.). Fragile, almost certainly against their terms, and a payments/GDPR liability. Deep links and consented APIs only.

## 4. Architecture

- **Next.js (App Router) + TypeScript** — one codebase for the public comparison/booking UI, the admin dashboard, and API routes. Tailwind for UI.
- **MySQL + Prisma** — changed from the original Postgres pick: the user hosts on Hostinger, whose managed web-app hosting includes MySQL, so one engine works everywhere (Docker locally, managed MySQL or VPS in prod). See `docs/DEPLOY_HOSTINGER.md`.
- **Adapter pattern** at the core — each operator/tier implements:

  ```ts
  interface OperatorAdapter {
    listRoutes(): Route[]
    listSailings(date: Date): Sailing[]
    getAvailability(sailing: Sailing): Availability   // static for Tier 1, live for Tiers 2–4
    startBooking(sailing: Sailing, party: Party): BookingHandoff
    // Tier 1: returns a deep link + records an intent
    // Tier 2/3: calls the affiliate/operator API
    // Tier 4: opens our own checkout
  }
  ```

- **Background jobs** (Vercel cron): refresh seasonal timetables, expire stale intents, send reminders.
- **Notifications** (email first, WhatsApp later): booking confirmations, and — important for Tabarca — **weather-cancellation alerts**, since crossings get cancelled in bad sea conditions and operators announce it on their own channels.
- **i18n ES/EN** from the start; mobile-first.
- **GDPR basics**: EU customers — minimal PII, clear privacy policy, data deletion path, no third-party trackers.

## 5. Data model (first cut)

```
Operator          name, homeUrl, bookingUrl, tier, notes
Port              name (Alicante, Santa Pola, Tabarca), coordinates
Route             operator → originPort → Tabarca, durationMin, seasonality
Sailing           route, date, departureTime, returnOptions, capacity?, status (scheduled/cancelled)
FareType          route, label (adult/child/resident), price, currency
Reservation       sailing, customer, partySize, fareBreakdown,
                  source (handoff | affiliate | operator-api | own),
                  status (intent → confirmed → completed | cancelled),
                  externalRef (operator booking reference)
Customer          name, email, phone, locale
IntegrationAccount operator, kind (woocommerce | getyourguide | …), credentials (encrypted)
```

`Reservation.status` starting at **intent** is what makes Tier 1 workable: the app is useful for managing reservations even before any operator API exists.

## 6. Roadmap

### Phase 1 — MVP (Tier 1 only) — ✅ built 2026-07-04
1. ✅ Scaffold Next.js 16 + Prisma + MySQL; seeded Kontiki (verified timetable) + Transtabarca (verified) + Tabarkeras (listed, timetable unverified).
2. ✅ Public page: pick a date → all sailings that day across operators → "Book with X" deep link, intent recorded.
3. ✅ Post-handoff flow: reservation page asks the customer to paste their booking ref → marked confirmed. (Email notifications still pending — Phase 2.)
4. ✅ Admin dashboard: list/filter reservations, inline status/ref updates, manual entry.

### Phase 2 — Live availability + revenue (Tier 2)
5. GetYourGuide Partner API / Civitatis affiliate for the Tabarca products → live availability + commission on bookings.
6. Timetable-drift checks (alert when operator site shows different times than our seed data).

### Phase 3 — First direct integration (Tier 3)
7. Approach Kontiki about WooCommerce REST keys / webhook plugin; build the adapter; bookings confirm automatically.
8. Weather-cancellation notifications to affected reservations.

### Phase 4 — Own inventory (Tier 4)
9. Stripe checkout + manifest views for operators who want us as their booking system.

## 7. Open questions

1. **Business model** — affiliate commission per booking? A B2B management tool for one operator? Your own agency taking group bookings? (Changes which tier to prioritize.)
2. **Primary user** — the general public comparing boats, or you managing reservations for known customers/groups?
3. **Priority port** — Alicante (Kontiki, pricier, longer crossing) vs Santa Pola (cheaper, every 30 min)?
4. **Repo visibility** — created private; flip to public anytime.
5. **Stack confirmation** — Next.js/Prisma/Postgres proposed above; happy to swap (e.g., FastAPI + React, or Rails) before scaffolding.

## Sources

- [Kontiki Cruises — official site](https://cruceroskontiki.com/en/) and [schedules & prices](https://cruceroskontiki.com/en/horarios-y-precios/)
- [Tabarkeras — Santa Pola ferries](https://tabarkeras.com/)
- [Transtabarca](https://www.islatabarca.com/) · [Viajes Isla Tabarca](https://viajesislatabarca.com/barco-a-tabarca/) · [Tabarca Experience](https://tabarcaexperience.com/)
- [Civitatis — Tabarca Island Ferry from Alicante](https://www.civitatis.com/en/alicante/tabarca-island-ferry/)
- [La Isla de Tabarca — getting there from Santa Pola](https://laisladetabarca.com/como-ir/desde-santa-pola/)
