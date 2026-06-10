# 🌐 Project Ball - Web Application (`apps/web`)

This is the web frontend and API server for Project Ball, built using **Astro** for server-side rendering, **Tailwind CSS v4** for styling, and **htmx** for lightweight, dynamic HTML-swapping interactions. It integrates with Celo via **viem** and runs on Node.js with **PostgreSQL** for sessions and off-chain data.

---

## 🏗️ Tech Stack

* **Framework:** [Astro v6](https://astro.build/) (SSR with `@astrojs/node` standalone mode).
* **Interactive UI:** [htmx v2](https://htmx.org/) for AJAX-based HTML node replacements, completely avoiding bulky SPA frameworks.
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with native CSS variables.
* **Web3 Integration:** [Viem v2](https://viem.sh/) for contract event parsing, balance reads, and network transaction checks.
* **Database & Auth:** [PostgreSQL](https://www.postgresql.org/) for bet confirmations, wallet sessions, and stats snapshots.

---

## 📂 Directory Layout

```txt
apps/web/
├── migrations/         # PostgreSQL schema migrations
├── public/             # Static assets (images, icons, robots.txt)
├── scripts/            # Database migration runner
├── src/
│   ├── components/     # Astro UI components (MatchCard, Navbar, Footer)
│   ├── data/           # Mock data and static content
│   ├── layouts/        # Page layout wrappers (Layout.astro)
│   ├── lib/            # Utility modules (contracts, formatting, auth, db)
│   ├── middleware.ts   # Session validation and routing security middleware
│   └── pages/          # Astro pages (Routes) and API endpoints
├── tests/              # Vitest unit tests and Playwright E2E specs
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

## 🛠️ Local Development

### 1. Database
Start PostgreSQL and apply migrations:

```bash
docker compose up db -d
pnpm db:migrate
```

Set `DATABASE_URL` in the root `.env` file (see `.env.example`).

### 2. Run Dev Server
Start the local server on port `4321`:

```bash
pnpm dev
```

### 3. Build
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

Deploy the full stack from the repo root:

```bash
cp .env.example .env
# Set PUBLIC_APP_URL, PUBLIC_PROJECT_BALL_POOLS_ADDRESS, and other PUBLIC_* vars
docker compose up -d --build
```

Migrations run automatically on container start. Rebuild the image when `PUBLIC_*` values change (they are baked in at build time).
