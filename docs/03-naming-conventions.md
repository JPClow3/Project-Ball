# 🗣️ Naming Conventions - Project Ball

This document defines standard terminology across the Project Ball codebase, API endpoints, database schemas, and user-facing copy.

---

## 🇧🇷 Product Language & Localization

To build a friendly, gaming-like interface for MiniPay users in Brazil, standard blockchain jargon must be avoided in the UI.

### Translation Matrix

| Technical Concept | Approved Copy (PT-BR) | Avoid in UI |
| :--- | :--- | :--- |
| Gas / Network Fee | **Taxa de rede** | Gas, Gwei, Taxa Celo, fee |
| Stablecoin / USD | **Dólar digital** | Crypto, Stablecoin, Token, USD, cUSD, USDT, USDC |
| Deposit | **Adicionar fundos** | Onramp, Funding, Transfer in, Depositar |
| Withdraw | **Sacar / Resgatar** | Offramp, Claim, Transfer out |
| Place Bet / Predict | **Dar um palpite** | Apostar, Bet, Registrar hash |
| Wallet Address | **Identidade / Perfil** | Endereço, Wallet Hash, Hex string |
| Pending | **Enviando... / Confirmando na rede...** | Loading, Pending, tx sent |

> [!WARNING]
> Never display raw transaction hashes, hex keys, or solidity error strings directly to the user. Show human-readable explanations instead.
> Example: Show "Saldo insuficiente para pagar a taxa da rede" instead of "insufficient funds for gas".

---

## 💻 Technical Code Terms

The codebase uses specific models and domain terms:

* **`Match`**: A scheduled football event (teams, kickoff time, ID).
* **`Pool`**: The financial bucket associated with a single `Match` on-chain.
* **`Outcome`**: The predicted result:
  * `0`: None (Invalid)
  * `1`: Home Win
  * `2`: Draw
  * `3`: Away Win
* **`Pick`**: A user's prediction and staked token configuration.
* **`Stake`**: The raw amount of stablecoin deposited by a user.
* **`NormalizedAmount`**: The 18-decimal representation of a stake, used to compute proportional shares.
* **`Claim`**: The collection of winnings after a match pool is resolved.

---

## 📦 Monorepo Workspaces

Maintain consistency inside `package.json` configurations using these workspace scopes:

- 🌐 `@project-ball/web` (Astro frontend and API route functions)
- ⛓️ `@project-ball/contracts` (Solidity smart contracts and deploy pipelines)
- 📂 `@project-ball/shared` (Common TypeScript definitions, ABIs, and token lists)
