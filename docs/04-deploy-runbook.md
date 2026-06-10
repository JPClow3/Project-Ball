# 🚢 Deploy Runbook - Project Ball

This guide details the deployment sequence for smart contracts and the frontend Astro application across local, testnet (Celo Sepolia), and mainnet environments.

---

## 💻 Local Environment Setup

1. **Verify Prerequisites:** Ensure Node, pnpm, and Foundry are installed.
2. **Install & Setup:**
   ```bash
   pnpm install
   forge install foundry-rs/forge-std --root packages/contracts
   ```
3. **Environment Setup:** Copy `.env.example` to `.env` in the root workspace directory.
4. **Boot Development Server:**
   ```bash
   pnpm dev
   ```
5. **MiniPay Device Tunneling:** Expose port `4321` using ngrok or a Cloudflare Tunnel:
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

If the frontend is deployed with Cloudflare Pages dashboard/Git builds, add these same `PUBLIC_*` keys in **Workers & Pages > Project > Settings > Variables and Secrets** for both Preview and Production. The values in `apps/web/wrangler.jsonc` are local development/reference values and are not enough for a dashboard-triggered build.

---

## 🚀 Production Deployment (Celo Mainnet & Cloudflare)

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
Run checks and compile the Astro build bundle before deploying to Cloudflare:
```bash
pnpm --filter @project-ball/web build
pnpm --filter @project-ball/web deploy
```

The current `deploy` script publishes the SSR app with `wrangler deploy` from the root `wrangler.jsonc`. Before a real release, replace the placeholder D1 id and public contract values there, then run the release preflight. If you switch this app to Cloudflare Pages auto-builds, configure the required `PUBLIC_*` variables in the Pages dashboard before triggering the build:

- `PUBLIC_APP_NAME`
- `PUBLIC_APP_URL`
- `PUBLIC_CHAIN_ID`
- `PUBLIC_CELO_RPC_URL`
- `PUBLIC_CELO_EXPLORER_URL`
- `PUBLIC_PROJECT_BALL_POOLS_ADDRESS`
- `PUBLIC_SUPPORT_URL`

Keep `PUBLIC_PROJECT_BALL_POOLS_ADDRESS` synced with the verified deployment address for the selected Celo network. A successful Pages build with missing dashboard variables can still render a broken client because Astro exposes `PUBLIC_*` values at build time.

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
