# Deploy Runbook

## Local

```bash
pnpm install
forge install foundry-rs/forge-std --root packages/contracts --no-commit
pnpm --filter @project-ball/web dev
```

Expose `localhost:4321` with ngrok or Cloudflare Tunnel for MiniPay Developer Mode testing.

## Testnet

```bash
forge test --root packages/contracts
forge script packages/contracts/script/DeployCeloSepolia.s.sol:DeployCeloSepolia \
  --root packages/contracts \
  --rpc-url "$CELO_SEPOLIA_RPC_URL" \
  --broadcast \
  --verify
```

Set Cloudflare preview variables:

- `PUBLIC_CHAIN_ID=11142220`
- `PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org`
- `PUBLIC_CELO_EXPLORER_URL=https://celo-sepolia.blockscout.com`
- `PUBLIC_PROJECT_BALL_POOLS_ADDRESS=<deployed contract>`

## Production

```bash
forge script packages/contracts/script/DeployCeloMainnet.s.sol:DeployCeloMainnet \
  --root packages/contracts \
  --rpc-url "$CELO_MAINNET_RPC_URL" \
  --broadcast \
  --verify \
  --etherscan-api-key "$ETHERSCAN_API_KEY"

pnpm --filter @project-ball/web build
pnpm --filter @project-ball/web deploy
```

After deploy, capture:

- Production HTTPS URL.
- Verified Celoscan contract URL.
- Sample transaction URLs for every user-facing contract method.
- PageSpeed mobile score.
- 360x640 screenshots.
