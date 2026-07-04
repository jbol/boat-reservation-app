# Deploying to Hostinger

Two ways to run this app on Hostinger, depending on the plan you have. Check
first: log in to hPanel and look at your hosting plan name.

| Your plan | Path |
|---|---|
| **Business** web hosting or any **Cloud** plan | **Path A** — managed web-app hosting, runs alongside your other websites at no extra cost (Business includes 5 web apps, Cloud Startup 10) |
| Premium / Single shared hosting | Path A isn't available — either upgrade to Business or use **Path B** |
| A Hostinger **VPS** (or willing to get one, ~€5–8/mo) | **Path B** — Docker Compose or Coolify |

Hostinger's managed hosting supports dynamic Next.js (SSR, API routes) with a
managed MySQL database — that's exactly what this app uses, and why it's on
MySQL rather than Postgres.

---

## Path A — Managed Web Apps hosting (Business/Cloud plans)

Runs next to your existing websites on the plan you already pay for.

1. **Create the web app.** hPanel → **Websites** → **Add website** → choose the
   **Web app / Node.js** option (labels shift over time — look for Node.js or
   "Web apps hosting").
2. **Connect GitHub.** Pick the `boat-reservation-app` repo, branch `main`.
   Hostinger auto-detects Next.js and runs the build for you (our `postinstall`
   script makes sure the Prisma client is generated). Select **Node.js 22** if
   asked (anything ≥ 20.9 works).
3. **Create the database.** hPanel → **Databases** → **MySQL Databases** →
   create a database + user. Note the database name, user, password, and host.
4. **Set environment variables** in the web app's settings:

   ```
   DATABASE_URL=mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME
   ADMIN_PASSWORD=<a strong password for /admin>
   ADMIN_COOKIE_SECRET=<run: openssl rand -hex 32>
   ```

5. **Run migrations + seed (one time, from your Mac).** hPanel → Databases →
   **Remote MySQL** → allow your current IP. Then, in the project folder:

   ```bash
   export DATABASE_URL="mysql://DB_USER:DB_PASSWORD@REMOTE_HOST:3306/DB_NAME"
   npx prisma migrate deploy
   npx prisma db seed
   ```

   Repeat `migrate deploy` whenever the schema changes (the platform only runs
   the build, not migrations).
6. **Domain.** Assign a subdomain of a domain you already have on the account,
   e.g. `tabarca.yourdomain.com`. SSL is automatic (Let's Encrypt). Your other
   websites are untouched.
7. **Redeploys** happen automatically on `git push` to `main` once GitHub is
   connected.

---

## Path B — VPS with Docker Compose

Full control; also the fallback if your plan doesn't offer web apps.

1. **Get the VPS.** Hostinger → VPS → KVM 1 is plenty to start. Pick the
   **"Ubuntu 24.04 with Docker"** template (or install Docker yourself).
2. **Clone and configure** (repo is private — create a GitHub fine-grained
   personal access token with read access, or make the repo public):

   ```bash
   git clone https://github.com/jbol/boat-reservation-app.git
   cd boat-reservation-app
   cat > .env <<'EOF'
   MYSQL_ROOT_PASSWORD=<random>
   MYSQL_PASSWORD=<random>
   ADMIN_PASSWORD=<strong password for /admin>
   ADMIN_COOKIE_SECRET=<run: openssl rand -hex 32>
   EOF
   ```

3. **Start everything** (builds the image, waits for MySQL, runs migrations,
   starts the app on port 3000):

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml run --rm migrate npx prisma db seed   # first boot only
   ```

4. **HTTPS + domain.** Add a DNS **A record** for `tabarca.yourdomain.com`
   pointing at the VPS IP (your existing sites on shared hosting are
   unaffected). For TLS, the quickest is Caddy on the VPS:

   ```bash
   apt install -y caddy
   printf 'tabarca.yourdomain.com {\n  reverse_proxy localhost:3000\n}\n' > /etc/caddy/Caddyfile
   systemctl reload caddy
   ```

5. **Deploy updates:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`

### Path B variant — Coolify (nicer ops, same VPS)

Hostinger ships an **"Ubuntu 24.04 with Coolify"** VPS template — a
self-hosted, Vercel-like panel: connect the GitHub repo via the GitHub App,
set **Build Pack = Dockerfile**, add a MySQL resource, set the same env vars,
and you get push-to-deploy, automatic SSL, and one-click rollbacks. Good
choice if you'd rather click than SSH.

---

## Which one should you pick?

- Already on **Business/Cloud**: Path A. Zero extra cost, zero server
  maintenance — try it first.
- Want push-to-deploy plus root access, or Path A's option is missing from
  your plan: Path B with the Coolify template.
