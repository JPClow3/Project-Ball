# ⛓️ Project Ball - Smart Contracts (`packages/contracts`)

This package houses the Solidity smart contracts that power Project Ball's on-chain match prediction pools. Developed using the **Foundry** framework, these contracts manage ERC-20 stakes, calculate odds, process proportional winner claims, and manage fee distribution.

---

## 🏗️ Architecture & Core Mechanics

The core logic resides in [ProjectBallPools.sol](file:///c:/Code/Personal/Projeto%20Jonakinho/packages/contracts/src/ProjectBallPools.sol).

```
                            ┌───────────────────┐
                            │    Bettor/User    │
                            └─────────┬─────────┘
                                      │
                                      │ 1. placeBet(matchId, outcome, token, amount)
                                      ▼
                            ┌───────────────────┐
                            │ ProjectBallPools  │
                            └────┬─────────┬────┘
                                 │         │
                   2a. Treasury  │         │ 2b. Burn Sink
                  (3.0% default) │         │ (2.0% default)
                                 ▼         ▼
                            ┌────────┐ ┌────────┐
                            │Treasury│ │BurnSink│
                            └────────┘ └────────┘
```

### 1. Multi-Stablecoin Accounting
To allow users to stake different ERC-20 tokens (e.g. USDm, USDC, USDT) 1:1 without swaps, the contract:
* Normalizes all token inputs to **18 decimals** for proportional share calculations.
* Stores token balances separately per-match so payouts can be claimed as a basket of the actual tokens that were staked.

### 2. Fee System
When an admin resolves a match, fees are collected on-chain:
* **Treasury Fee:** Default is `300` BPS (3.0%), sent to the Treasury address.
* **Burn Fee:** Default is `200` BPS (2.0%), sent to a Burn Sink address.
* Total fees are capped at a maximum of `500` BPS (5.0%).

---

## 🛠️ Contract API Reference

### User Actions
* **`placeBet(bytes32 matchId, uint8 rawOutcome, address token, uint256 amount)`**
  Stakes a specified `amount` of a supported `token` on a match outcome. Reverts if the match is locked or the user has already predicted.
* **`claim(bytes32 matchId)`**
  Distributes a proportional basket of the pool's remaining stablecoins to winning accounts after fee deductions.
* **`refund(bytes32 matchId)`**
  Allows users to recover their full stake if a match is voided (cancelled or settled with no winners).

### Admin/Owner Actions
* **`createMatch(bytes32 matchId, uint64 lockTime)`**
  Registers a new match ID and sets the lock timestamp (kickoff time).
* **`resolveMatch(bytes32 matchId, uint8 rawResult)`**
  Settles a match with the winning outcome (`1` Home, `2` Draw, `3` Away), triggering fee collection. Voided if `winnerNormalized == 0`.
* **`voidMatch(bytes32 matchId)`**
  Forces a match pool into the voided state, enabling user refunds.
* **`configureToken(address token, uint8 decimals, bool enabled)`**
  Registers or updates a supported staking token.
* **`ownerSweep(address token)`**
  Emergency sweep function to withdraw contract dust balance of `token` to the treasury.

---

## 💻 Local Development & Command Reference

Ensure you have [Foundry installed](https://book.getfoundry.sh/getting-started/installation) on your machine.

### 1. Install Submodules
Install dependencies like `forge-std`:
```bash
forge install foundry-rs/forge-std
```

### 2. Run Smart Contract Tests
Execute the Solidity test suite:
```bash
forge test
```

### 3. Generate Gas Snapshots
Create a gas report to analyze contract execution costs:
```bash
forge snapshot
```

### 4. Code Coverage
Analyze test coverage:
```bash
forge coverage
```

---

## 🚢 Deployment & Verification

Deployments are automated using Foundry solidity scripts:

### Celo Sepolia (Testnet)
```bash
forge script script/DeployCeloSepolia.s.sol:DeployCeloSepolia \
  --rpc-url "$CELO_SEPOLIA_RPC_URL" \
  --broadcast \
  --verify
```

### Celo Mainnet (Production)
```bash
forge script script/DeployCeloMainnet.s.sol:DeployCeloMainnet \
  --rpc-url "$CELO_MAINNET_RPC_URL" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"
```
