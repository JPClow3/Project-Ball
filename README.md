# ⚽ Project Ball

[![Celo Mainnet](https://img.shields.io/badge/Network-Celo-35D07F?style=flat-square)](https://celo.org)
[![MiniPay Optimized](https://img.shields.io/badge/Wallet-MiniPay-00E676?style=flat-square)](https://www.opera.com/products/minipay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Project Ball is a mobile-first football prediction decentralized application (dApp) specifically engineered for the Celo blockchain and Opera's MiniPay wallet. 

The application is designed to behave like a fast, casual mobile web game rather than a complex DeFi protocol. Users can select match outcomes (win, draw, or away win) and stake stablecoins directly from their MiniPay wallet, with match outcomes verified on-chain and UI states updated instantly without page reloads.

---

## 🚀 Key Features

- **Zero Friction UX:** Automated wallet connection, no message signing requirements, and translation of gas/blockchain concepts into intuitive Brazilian Portuguese terminology (e.g., *taxa de rede*, *dólar digital*).
- **Multi-Stablecoin Support:** Place picks using **USDm**, **USDC**, or **USDT** (calculated 1:1 on-chain).
- **Fast Card Updates:** Built using Astro and [htmx](https://htmx.org/) to perform smooth, partial-page swaps of match card markup after checking transactions via server-side verification.
- **Proportional Claims:** Winners receive their payout dynamically distributed as a proportional basket of the actual stablecoins staked in the match pool, minus a small protocol/burn fee.

---

## 🛠️ Stack & Technologies

* **Frontend Web App:** [Astro](https://astro.build/), [Tailwind CSS v4](https://tailwindcss.com/), [htmx](https://htmx.org/), and vanilla TypeScript.
* **Blockchain Operations:** [Viem](https://viem.sh/) for contract reads, balance checks, ERC-20 approvals, and transaction submission.
* **Smart Contracts:** [Solidity](https://soliditylang.org/) contracts developed, tested, and deployed using [Foundry](https://book.getfoundry.sh/).
* **Backend & API:** Astro SSR on Node.js with [PostgreSQL](https://www.postgresql.org/) for sessions, bet cache, and stats. Deployed via Docker.

---

## 📂 Project Structure

Project Ball is configured as a `pnpm` monorepo containing the following workspaces:

```txt
├── apps/
│   └── web/                  # Astro frontend and server-side API handlers (Node.js SSR)
├── packages/
│   ├── contracts/            # Solidity smart contracts and Foundry deploy/test scripts
│   └── shared/               # Shared TypeScript types, utility constants, and ABI configurations
└── docs/                     # Product, architecture, and MiniPay checklists
```

For a detailed look into each component, refer to:
- [Web App README](file:///c:/Code/Personal/Projeto%20Jonakinho/apps/web/README.md)
- [Smart Contracts README](file:///c:/Code/Personal/Projeto%20Jonakinho/packages/contracts/README.md)
- [Shared Package README](file:///c:/Code/Personal/Projeto%20Jonakinho/packages/shared/README.md)

---

## ⚙️ Environment Variables Setup

Before running the project, copy the environment configuration template to a new `.env` file in the root directory:

```bash
cp .env.example .env
```

Review and update the variables in `.env` as required:
- `PUBLIC_PROJECT_BALL_POOLS_ADDRESS`: Address of the deployed `ProjectBallPools` contract.
- `PUBLIC_APP_URL`: Canonical HTTPS URL of the deployed app (required for production Docker builds).
- `DATABASE_URL`: PostgreSQL connection string for sessions and off-chain data.
- `DEPLOYER_PRIVATE_KEY`: Private key used for contract deployment and transactions.
- `OWNER_ADDRESS`, `TREASURY_ADDRESS`, `BURN_SINK_ADDRESS`: Owner and treasury addresses for contract configuration.

---

## 💻 Local Setup & Development

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v20+ recommended)
* [pnpm](https://pnpm.io/) (v10+ recommended)
* [Docker](https://www.docker.com/) (for production deployment and local PostgreSQL)
* [Foundry](https://book.getfoundry.sh/getting-started/installation) (for smart contract testing and compilation)

### 2. Install Dependencies
Run the following from the root directory to install all monorepo dependencies and download Solidity submodules:

```bash
pnpm install
forge install foundry-rs/forge-std --root packages/contracts
```

### 3. Start PostgreSQL (optional for local dev)
The app falls back to in-memory storage without a database. For persistent sessions and bet cache, start Postgres:

```bash
docker compose up db -d
pnpm --filter @project-ball/web db:migrate
```

### 4. Spin up the Development Server
Start the local server for the web app:

```bash
pnpm dev
```

The app will run at `http://localhost:4321`.

> [!TIP]
> **Testing on MiniPay Devices:**
> To test the application on an actual phone inside MiniPay, expose your local port `4321` to the internet using ngrok:
> ```bash
> ngrok http 4321
> ```
> Load the generated HTTPS URL in the MiniPay Developer Mode settings on your device.

---

## 🐳 Docker Deployment

Deploy the full stack (web + PostgreSQL) with one command:

```bash
cp .env.example .env   # set PUBLIC_* and contract address
pnpm deploy            # runs: docker compose up -d --build
```

The app will be available at `http://localhost:4321`. Set `PUBLIC_APP_URL` to your production HTTPS URL before building for a real release.

---

## 🧪 Testing & Validation

Run quality checks and tests across the monorepo workspaces:

```bash
# Lint code and check TypeScript types across all workspaces
pnpm check

# Run unit tests
pnpm test

# Run Playwright E2E tests
pnpm test:e2e

# Run Foundry smart contract tests
forge test --root packages/contracts
```

---

## 📚 Reference Documentation

For deeper insight into the design decisions, deployment runbooks, and MiniPay submission checklists, please consult:

- 📄 [00 - Product Brief](file:///c:/Code/Personal/Projeto%20Jonakinho/docs/00-product-brief.md) — Product vision, DNA, and target user parameters.
- 🎯 [01 - MVP Scope](file:///c:/Code/Personal/Projeto%20Jonakinho/docs/01-mvp-scope.md) — What is built, what is deferred, and core success metrics.
- 🏗️ [02 - Architecture](file:///c:/Code/Personal/Projeto%20Jonakinho/docs/02-architecture.md) — Transaction flow diagrams, data boundaries, and pool details.
- 🗣️ [03 - Naming Conventions](file:///c:/Code/Personal/Projeto%20Jonakinho/docs/03-naming-conventions.md) — Translation rules, UI vocabulary, and database fields.
- 🚢 [04 - Deploy Runbook](file:///c:/Code/Personal/Projeto%20Jonakinho/docs/04-deploy-runbook.md) — Step-by-step instructions for Celo Sepolia and Celo Mainnet deployment.
- ✅ [05 - MiniPay Submission Checklist](file:///c:/Code/Personal/Projeto%20Jonakinho/docs/05-minipay-proof-of-ship-checklist.md) — MiniPay compatibility, latency guidelines, and Talent App registration rules.

---

## 📄 License

This project is licensed under the MIT License. See individual package files for specifics.
