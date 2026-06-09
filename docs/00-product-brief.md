# 📄 Product Brief - Project Ball

Project Ball is a mobile-first football prediction dApp built for the **Celo Proof of Ship** campaign and optimized for **MiniPay**. The product design focuses on mimicking a fast, casual mobile sports game rather than a complex DeFi dashboard: featuring dark glossy visuals, large match cards, intuitive options, and instant feedback.

---

## 🧬 Product DNA

* **Zero Friction UX:** Users should never be confronted with technical concepts like *gas fees*, *transaction hashes*, or *cryptographic signatures*. Any complex blockchain actions must happen behind the scenes.
* **MiniPay-First Integration:** Fully integrated inside MiniPay. Features automated wallet detection and connection (no explicit "Connect Wallet" button required), utilizes stablecoins exclusively (cUSD, USDC, USDT), and entirely avoids arbitrary message signing prompts.
* **Instant Interaction Feedback:** Leverages `htmx` to transition match cards from *pending* to *registered* states seamlessly without forcing a full web page reload.
* **Retention Through Rhythm:** Daily match prediction pools format the core rhythm of the application, encouraging players to return daily, with tournament-wide prediction markets planned as secondary milestones.

---

## 🎯 MVP Milestones

The goal is to launch a fully-compliant open-source dApp that qualifies for Celo Proof of Ship scoring:

- [x] **MiniPay-Compatible App:** High-performance web interface designed for a `360x640` viewport.
- [x] **Verified Smart Contract:** Solc-compiled contract deployed on Celo Mainnet and verified on Celoscan.
- [x] **Public Traction Page:** Real-time stats page (`/stats`) presenting active user count, pool sizes, and transaction analytics.
- [x] **Legal & Support Ready:** Clean support portals, user terms, privacy policies, and a complete network manifest.
