# ADR 0001: Multi-Stablecoin Normalized Pool

## Status

Accepted

## Decision

The MVP uses one logical pool per match and accepts USDm, USDC, and USDT. Each stake is normalized to 18 decimals and counted 1:1 as USD value. Claims pay winners a proportional basket of the actual stablecoins held by the pool after protocol fees.

## Consequences

- Users can enter with the stablecoin they already hold.
- The contract avoids oracles and swaps in the MVP.
- Winners may receive more than one stablecoin on claim.
- Accounting must preserve both normalized totals and token balances.
