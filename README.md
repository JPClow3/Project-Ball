# Jonakinho

Jonakinho is a mobile-first football prediction dApp for Celo and MiniPay. The MVP lets users place small stablecoin picks on match outcomes, confirms transactions with a fast htmx card refresh, and keeps the product simple enough to feel like a casual mobile game rather than a DeFi protocol.

## Stack

- Astro, Tailwind CSS 4, htmx, and vanilla TypeScript for the web app.
- Viem for Celo reads and wallet transactions.
- Foundry for smart contracts and Celo deploy/verification.
- Cloudflare Workers/Pages with D1 for SSR/API and lightweight off-chain state.

## Workspace

```txt
apps/web/                 Astro app
packages/contracts/       Foundry smart contracts
packages/shared/          shared types, constants, and ABI metadata
docs/                     product, architecture, deploy, and MiniPay docs
```

## Local Setup

```bash
pnpm install
forge install foundry-rs/forge-std --root packages/contracts --no-commit
pnpm --filter @jonakinho/web dev
```

For MiniPay device testing, expose the local server with ngrok or Cloudflare Tunnel and load the HTTPS URL in MiniPay Developer Mode.

## Validation

```bash
pnpm check
pnpm test
pnpm --filter @jonakinho/web test:e2e
forge test --root packages/contracts
```

`forge` is required for contract tests and deploys.
