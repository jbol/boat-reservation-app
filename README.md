# Tabarca Boat Reservation App

One place to see every boat heading to Isla de Tabarca (from Alicante, Santa Pola, …), compare schedules and prices, and book — with bookings fulfilled through the operators' **existing** booking systems (Kontiki, Tabarkeras, Transtabarca, …), plus a dashboard to manage the reservations made through the app.

## Status

🚧 **Planning.** No application code yet. Start with [PLAN.md](PLAN.md) — it covers the operator landscape, the tiered integration strategy, proposed architecture, data model, and a phased roadmap.

## The core idea

Small Tabarca boat operators each have their own website and booking flow, and none of them publish a public API. Instead of replacing those systems, this app:

1. **Aggregates** schedules and prices across operators in one comparison view.
2. **Hands off** the actual booking to the operator's own checkout (deep links first, real API integrations where partnerships allow).
3. **Tracks** reservations made through the app so they can be managed in one dashboard.

## Proposed stack (open to change)

- Next.js (App Router) + TypeScript, Tailwind CSS
- Postgres + Prisma
- Deployed on Vercel
- i18n (ES/EN) and mobile-first from day one — the audience is tourists on phones

## Repo layout (planned)

```
PLAN.md          ← the plan: read this first
docs/            ← research notes, operator integration notes (future)
app/ ...         ← Next.js app (future)
```
