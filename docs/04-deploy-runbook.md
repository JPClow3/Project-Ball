# 🚢 Deploy Runbook - Project Ball

This guide details the deployment sequence for smart contracts and the frontend Astro application across local, testnet (Celo Sepolia), and mainnet environments.

---

## 💻 Local Environment Setup

1. **Verify Prerequisites:** Ensure Node, pnpm, Docker, and Foundry are installed.
2. **Install & Setup:**
   ```bash
   pnpm install
   forge install foundry-rs/forge-std --root packages/contracts
   ```
3. **Environment Setup:** Copy `.env.example` to `.env` in the root workspace directory.
4. **Start PostgreSQL (optional):**
   ```bash
   docker compose up db -d
   pnpm --filter @project-ball/web db:migrate
   ```
5. **Boot Development Server:**
   ```bash
   pnpm dev
   ```
6. **MiniPay Device Tunneling:** Expose port `4321` using ngrok:
   ```bash
   ngrok http 4321
   ```

---

## 🧪 Testnet Deployment (Celo Sepolia)

Follow these steps to deploy and verify the smart contracts on Celo Sepolia:

### 1. Execute Contract Tests
Ensure all local tests pass before proceeding:
```bash
forge test --root packages/contracts
```

### 2. Run Deployment Script
Deploy the contracts using the Sepolia script:
```bash
forge script packages/contracts/script/DeployCeloSepolia.s.sol:DeployCeloSepolia \
  --root packages/contracts \
  --rpc-url "$CELO_SEPOLIA_RPC_URL" \
  --broadcast \
  --verify
```

### 3. Update Environment Variables
Configure the frontend environment with the newly deployed contract address:
- `PUBLIC_CHAIN_ID=11142220`
- `PUBLIC_CELO_RPC_URL=https://forno-sepolia.celo-testnet.org`
- `PUBLIC_CELO_EXPLORER_URL=https://celo-sepolia.blockscout.com`
- `PUBLIC_PROJECT_BALL_POOLS_ADDRESS=<deployed-contract-address>`

---

## 🚀 Production Deployment (Celo Mainnet & Docker)

### 1. Smart Contract Deployment
Execute the mainnet deployment script:
```bash
forge script packages/contracts/script/DeployCeloMainnet.s.sol:DeployCeloMainnet \
  --root packages/contracts \
  --rpc-url "$CELO_MAINNET_RPC_URL" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"
```

> [!IMPORTANT]
> Keep the private key used for deployment secure. Verify that the deployer address holds sufficient Celo to cover gas fees.

### 2. Frontend Application Deployment
Set production values in `.env` before building:

- `PUBLIC_APP_NAME`
- `PUBLIC_APP_URL` (must be your production HTTPS URL)
- `PUBLIC_CHAIN_ID`
- `PUBLIC_CELO_RPC_URL`
- `PUBLIC_CELO_EXPLORER_URL`
- `PUBLIC_PROJECT_BALL_POOLS_ADDRESS`
- `PUBLIC_SUPPORT_URL`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

Deploy with Docker Compose:

```bash
docker compose up -d --build
```

Or from the repo root:

```bash
pnpm deploy
```

The web container runs database migrations on startup, then starts the Astro Node.js server on port `4321`.

> [!NOTE]
> `PUBLIC_*` values are baked into the Astro build at image build time. After changing them, rebuild with `docker compose up -d --build`.

---

## ✅ Post-Deployment Verification Checklist

After deploying the production build, compile the following reference logs:

- [ ] **Production URL:** Expose the live HTTPS production URL of the dApp.
- [ ] **Verified Contract Link:** Check that the contract is fully readable on [Celoscan](https://celoscan.io/).
- [ ] **Audit Transactions:** Run and log sample transaction hashes for:
  - `createMatch`
  - `placeBet`
  - `resolveMatch`
  - `claim`
- [ ] **Mobile Compliance:** Verify that a Google PageSpeed mobile score of $\ge 90$ is maintained.
- [ ] **Visual Layouts:** Capture `360x640` viewport screenshots for submission.
