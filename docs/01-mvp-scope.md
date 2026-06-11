# 🎯 MVP Scope - Project Ball

This document lists the feature set, structural limitations, and criteria for the first public MVP release of Project Ball.

---

## ✅ In Scope

* **Match Outcomes:** Daily match pools supporting win-draw-win prediction mechanics.
* **Stablecoin Support:** Allowing bet stakes using multiple stablecoin tokens: **USDm**, **USDC**, and **USDT**.
* **Fair Play Restrictions:** Exactly one match prediction is permitted per wallet per match.
* **Kickoff Lock:** Automatic locking of predictions based on match kickoff times.
* **Admin Resolution:** Contract owner/admin sets the final official match outcome.
* **Proportional Claims:** Payouts to winners are calculated proportionally and distributed as a basket of the remaining pool assets.
* **Void & Refund Support:** Automated refund processing for voided games or pools where no correct outcome was selected.
* **Dynamic Card State Swaps:** Fast `htmx` interface updates post-transaction confirmation.
* **Leaderboard & Ranking:** A competitive system ranking users on prediction accuracy (60%) and normalized log-scaled winnings (40%), optimized to avoid N+1 query limits.
* **Analytics & Compliance:** Public stats, support info, privacy policy, and terms of service.

---

## 🚫 Out of Scope

* **Automated Oracles:** Integration of Chainlink or custom result feeding systems (managed via admin keys for MVP).
* **Player-Specific Markets:** Predictions based on player stats, goalscorers, or injury reports.
* **Speculative Features:** Burn features, odds multipliers, or insurance structures.
* **Self-Custody Management:** Private key creation, credential backup, or off-chain message signature verification.
* **IP/Geofencing Controls:** Complex regional routing and IP blocks prior to formal legal review.

---

## 🏆 MVP Success Criteria

> [!IMPORTANT]
> The app must satisfy the following user-centric performance metrics:
> 
> 1. **Time-to-Bet:** A new user can open the application on a standard `360x640` viewport and complete their first match pick in under **30 seconds**.
> 2. **Responsive UX:** The match card state refreshes to show the registered pick within **3 seconds** of contract transaction execution.
> 3. **Verification:** The contract codebase must compile, test, deploy, and achieve 100% verification on the Celoscan explorer.
> 4. **Compliance:** The system exposes public routes for `/stats`, support, user terms, and privacy guidelines.
