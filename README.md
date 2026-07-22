# Tabarca Boat Reservation App

One place to see every boat heading to Isla de Tabarca (from Alicante, Santa Pola and Torrevieja), compare schedules and prices, and book — with bookings fulfilled through the operators' **existing** systems (Kontiki, Transtabarca, Marítimas Torrevieja, Tabarkeras, …), plus an admin dashboard to manage the reservations made through the app.

## Status

✅ **Phase 1 (MVP) built** — sailing comparison, deep-link booking hand-off with reservation tracking, admin dashboard, ES/EN. See [PLAN.md](PLAN.md) for the full strategy and roadmap, and [docs/DEPLOY_HOSTINGER.md](docs/DEPLOY_HOSTINGER.md) for hosting.

## How it works

1. **Compare** — pick a date, see all sailings across operators (seeded from the operators' published summer 2026 timetables).
2. **Book** — the app records a reservation *intent*, then hands off to the operator's own checkout (they're the merchant of record). Back on the app, the customer saves their booking reference and the reservation becomes *confirmed*.
3. **Manage** — `/admin` (password-protected) lists every reservation with filters, status updates, manual entry for phone/counter bookings, and sailing cancellation (weather happens on this crossing) that emails everyone affected.
4. **Notify** — customers get their reservation link by email at intent and on confirmation, and `/find` re-sends links for an email address.

## Stack

Next.js 16 (App Router, server components + server actions, Turbopack) · TypeScript · Tailwind 4 · Prisma 6 · MySQL 8 (matches Hostinger's managed hosting) · Docker for local dev DB and VPS deploys.

## Local development

Prereqs: Docker Desktop, Node 22 (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
docker compose up -d --wait       # MySQL on localhost:3307
npx prisma migrate dev            # create schema
npx prisma db seed                # load operators + summer 2026 timetables
npm run dev                       # http://localhost:3000
```

Admin lives at `/admin` — password is `ADMIN_PASSWORD` in `.env` (dev default: `tabarca-admin`).

Emails print to the dev-server console unless `SMTP_*` is set in `.env` (see `.env.example`).

## Testing & CI

```bash
npm run lint        # eslint
npm run typecheck   # next typegen + tsc --noEmit
npm run test:unit   # vitest — pure logic (pricing, dates, i18n parity, admin auth)
npm run test:e2e    # playwright — full flows against a real build + seeded MySQL
```

- **Pre-push hook** (husky) runs lint + typecheck + unit tests before every `git push`.
- **GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push to `main` and every PR: a quality job (lint, typecheck, unit, build) and an E2E job (spins up MySQL, migrates, seeds, builds, runs Playwright).
- E2E needs the local DB up (`docker compose up -d`); it starts its own server. See [docs/TESTING.md](docs/TESTING.md).

## Layout

```
PLAN.md                  strategy, operator research, roadmap
docs/DEPLOY_HOSTINGER.md hosting guide (managed web-app + VPS paths)
prisma/                  schema, migrations, seed (real timetables, transcribed 2026-07-04)
lib/                     prisma client, i18n, server actions, operator adapters, admin auth, pricing
app/                     / (compare) · /book/[sailingId] · /r/[id] (hand-off & status) · /admin
e2e/                     Playwright specs (home, booking, find, admin)
.github/workflows/ci.yml GitHub Actions pipeline
Dockerfile + docker-compose.prod.yml   VPS deployment
```

## Caveats

- Timetables/prices are transcribed seed data, not live feeds — verify against operator sites before relying on them (each operator row records `scheduleCheckedAt`). Live availability arrives with the Tier 2/3 integrations in [PLAN.md](PLAN.md).
- Bookings are completed on the operators' sites; this app tracks them but is not the merchant.
