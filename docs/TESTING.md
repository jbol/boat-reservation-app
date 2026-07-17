# Testing & CI

Three layers, cheapest first:

| Layer | Tool | Runs | Covers |
|---|---|---|---|
| Pre-push hook | husky | on `git push`, locally | lint + typecheck + unit tests |
| CI — quality | GitHub Actions | push to `main`, PRs | lint, typecheck, unit tests, `next build` |
| CI — E2E | GitHub Actions + Playwright | push to `main`, PRs | full user flows against a real build + seeded MySQL |

## Unit tests (Vitest)

Pure, fast, no database — [lib/*.test.ts](../lib):

- `pricing` — passenger clamping, party size, fare estimation (incl. unknown fare → free, not NaN).
- `format` — currency, timezone-safe date-key math, ES/EN date formatting.
- `i18n` — **ES and EN dictionaries have identical keys** (guards against a half-translated string) and no empties.
- `adapters` — deep-link hand-off, unknown-tier fallback.
- `adminAuth` — password check is correct and timing-safe (no throw on length mismatch); session token determinism.

```bash
npm run test:unit            # once
npx vitest                   # watch mode
npx vitest --coverage        # coverage report → coverage/
```

## E2E tests (Playwright)

[e2e/](../e2e) drives a real browser against a real server + seeded DB:

- `home` — multi-operator listing for a date; ES/EN toggle.
- `booking` — book → reservation intent → attach operator reference → confirmed.
- `find` — booking lookup returns the same response regardless of whether the email exists.
- `admin` — login; cancel a sailing then restore it (idempotent, leaves the schedule untouched).

Specs run **serially on one worker** because the admin spec mutates shared sailing state. The UI is pinned to English per test for deterministic assertions. The test date (`SEED_DATE` in [e2e/helpers.ts](../e2e/helpers.ts)) sits inside the seeded summer-2026 season.

```bash
docker compose up -d                     # DB must be up; specs start their own server
npm run test:e2e
E2E_WEBSERVER_CMD="npm run dev" npm run test:e2e   # iterate without a prod build
npx playwright test --ui                 # interactive
```

First run needs the browser: `npx playwright install chromium`.

## CI

[.github/workflows/ci.yml](../.github/workflows/ci.yml) — two jobs on Node 22:

- **quality** — `npm ci`, lint, typecheck, unit tests, build. A dummy `DATABASE_URL` is set because Prisma/Next want the variable present even though build never connects (all routes are dynamic).
- **e2e** — a `mysql:8.4` service container, `prisma migrate deploy` + seed, build, `playwright install --with-deps chromium`, then the specs. The Playwright HTML report is uploaded as an artifact if E2E fails.

Runs are cancelled when superseded on the same branch/PR.

## Deployment gate

CI validates code; it does not deploy. Deploys to `tabarcaboats.com` happen through the Hostinger MCP connector (see [DEPLOY_HOSTINGER.md](DEPLOY_HOSTINGER.md)). Protect `main` with the CI checks as a required status so only green code can be merged and then deployed.
