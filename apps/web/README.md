# 🌐 Project Ball - Web Application (`apps/web`)

This is the web frontend and API server for Project Ball, built using **Astro** for server-side rendering, **Tailwind CSS v4** for styling, and **htmx** for lightweight, dynamic HTML-swapping interactions. It integrates with Celo via **viem** and deploys with Cloudflare's edge runtime, using **Cloudflare D1** for database caching.

---

## 🏗️ Tech Stack

* **Framework:** [Astro v6](https://astro.build/) (Configured in hybrid SSR/Prerender mode with `@astrojs/cloudflare`).
* **Interactive UI:** [htmx v2](https://htmx.org/) for AJAX-based HTML node replacements, completely avoiding bulky SPA frameworks.
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with native CSS variables.
* **Web3 Integration:** [Viem v2](https://viem.sh/) for contract event parsing, balance reads, and network transaction checks.
* **Database & Auth:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite on the edge) for caching match data and session credentials.

---

## 📂 Directory Layout

```txt
apps/web/
├── migrations/         # D1 database schema migrations
├── public/             # Static assets (images, icons, robots.txt)
├── scripts/            # Pre-deployment validation and preflight scripts
├── src/
│   ├── components/     # Astro UI components (MatchCard, Navbar, Footer)
│   ├── data/           # Mock data and database client definitions
│   ├── layouts/        # Page layout wrappers (Layout.astro)
│   ├── lib/            # Utility modules (contracts, formatting, auth)
│   ├── middleware.ts   # Session validation and routing security middleware
│   └── pages/          # Astro pages (Routes) and API endpoints
├── tests/              # Vitest unit tests and Playwright E2E specs
├── wrangler.jsonc      # Cloudflare wrangler development configuration
└── package.json        # Web app dependencies and scripts
```

---

## 🗺️ Route Mapping

### User Pages
* `GET /`: Home page. Renders active matches and betting outcome options.
* `GET /meus-palpites`: Matches where the user has placed a bet.
* `GET /premios`: Unclaimed winnings and payout history.
* `GET /about`: Explanatory details about Project Ball's rules.
* `GET /support`: Support ticket forms and Telegram channels.
* `GET /stats`: Real-time application metrics (DAU, pool sizes, volumes).
* `GET /terms`: Terms and conditions.
* `GET /privacy`: Privacy guidelines.

### Admin/Auth Pages
* `GET /login`: Admin panel login.
* `GET /register`: Owner account registration.

### API Endpoints
* `POST /api/confirm-bet`: Receives transaction hashes, checks receipts on-chain, and caches predictions.
* `GET /api/matches/[id]/card`: Returns a fresh HTML fragment of a match card for htmx to inject post-bet.
* `POST /api/auth/nonce`: Generates cryptographic nonces to mitigate replay attacks.
* `POST /api/auth/login` & `POST /api/auth/register`: Authentication management.
* `POST /api/auth/logout`: Clears authorization cookies.

---

## 🛠️ Local Development & Cloudflare D1

### 1. Database Migrations
Initialize the local SQLite database from the migrations folder using Wrangler:
```bash
npx wrangler d1 migrations apply project-ball-db --local
```

### 2. Run Dev Server
Start the local server. It targets port `4321` on `127.0.0.1`:
```bash
pnpm dev
```

### 3. Build & Preflight Checks
Generate a production bundle:
```bash
pnpm build
```

---

## 🧪 Testing Suites

Run tests scoped to the web package:

```bash
# Run Unit Tests (Vitest)
pnpm test

# Run E2E Integration Tests (Playwright)
pnpm test:e2e

# Run Security & Penetration Audits
pnpm test:security

# Run Lighthouse Performance Simulation
pnpm test:lighthouse
```

---

## 🚀 Deployment

The `deploy` script automatically executes a release preflight audit (verifying env configurations and database links) before publishing to Cloudflare:

```bash
pnpm deploy
```

The current package deploy path uses `wrangler deploy --cwd ../..`, so the root `wrangler.jsonc` is the Worker SSR deploy source of truth. The `apps/web/wrangler.jsonc` file is kept as local development/reference configuration.

For Cloudflare Pages dashboard/Git builds, configure the `PUBLIC_*` values in **Workers & Pages > Settings > Variables and Secrets** before the build runs. In particular, do not rely on the local `apps/web/wrangler.jsonc` values for `PUBLIC_CELO_RPC_URL` or `PUBLIC_PROJECT_BALL_POOLS_ADDRESS` when Pages is building production.
