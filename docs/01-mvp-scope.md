# MVP Scope

## In Scope

- Daily match pools for win/draw/win outcomes.
- Stablecoin staking with USDm, USDC, and USDT.
- One pick per wallet per match.
- Match lock before kickoff.
- Admin result resolution.
- Proportional claims for winners.
- Refunds for voided matches or no-winner matches.
- htmx-powered card refresh after on-chain confirmation.
- Public stats page and MiniPay submission checklist.

## Out of Scope

- Oracle-based official result ingestion.
- Long-term player markets.
- Injury insurance and super-pick burn flows.
- User custody, private key storage, or message-sign authentication.
- Legal geofencing enforcement before counsel review.

## MVP Success Criteria

- A user can open the app on a 360x640 viewport and place a match pick in under 30 seconds.
- The card updates to a registered state after `/api/confirm-bet` validates a transaction.
- Contract source can be verified on Celoscan.
- The app exposes support, terms, privacy, and `/stats`.
