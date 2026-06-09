# 📂 Project Ball - Shared Utilities (`packages/shared`)

This internal package exports common TypeScript typings, smart contract ABI constants, Celo blockchain configuration records, and stablecoin contract descriptors used across both the frontend web app (`@project-ball/web`) and the contract scripts (`@project-ball/contracts`).

---

## 📦 Exported Modules

The source code resides under `src/` and exports:

### 1. [`abi.ts`](file:///c:/Code/Personal/Projeto%20Jonakinho/packages/shared/src/abi.ts)
Contains compile-safe ABI JSON constants for the main `ProjectBallPools` contract and Standard ERC-20 structures, facilitating typesafe Viem client hooks:
* `PROJECT_BALL_POOLS_ABI`: ABI mapping for all methods, views, events, and custom error types.
* `ERC20_ABI`: Minimum required interface mappings for ERC-20 `balanceOf`, `approve`, and `transfer` interactions.

### 2. [`chains.ts`](file:///c:/Code/Personal/Projeto%20Jonakinho/packages/shared/src/chains.ts)
Defines supported blockchain parameters for Celo:
```typescript
export const CELO_MAINNET = {
  id: 42220,
  name: "Celo Mainnet",
  rpcUrl: "https://forno.celo.org",
  explorerUrl: "https://celoscan.io"
};
```

### 3. [`tokens.ts`](file:///c:/Code/Personal/Projeto%20Jonakinho/packages/shared/src/tokens.ts)
Describes the stablecoins supported by Project Ball on Celo Sepolia and Celo Mainnet:
* **USDm** (18 Decimals)
* **USDC** (6 Decimals)
* **USDT** (6 Decimals)
* Provides helpers:
  * `getTokenAddress(symbol, chainId)`
  * `getFeeCurrencyAddress(symbol, chainId)`

### 4. [`types.ts`](file:///c:/Code/Personal/Projeto%20Jonakinho/packages/shared/src/types.ts)
Universal TypeScript models:
* `Outcome`: `"HOME"` | `"DRAW"` | `"AWAY"`
* `MatchStatus`: `"open"` | `"locked"` | `"resolved"` | `"voided"`
* `Match`: Structure representing a match cache.
* `StatsSnapshot`: Type representing application health and usage metrics.

---

## 🛠️ Build Sequence

Since packages import from the compiled directory of this workspace, build this package first:

```bash
# Build the typescript files to dist/
pnpm build
```

This will run TypeScript compilation (`tsc`) and outputs target files to `dist/`.
