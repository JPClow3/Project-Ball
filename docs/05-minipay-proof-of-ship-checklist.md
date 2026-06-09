# ✅ MiniPay & Proof of Ship Checklist - Project Ball

This checklist ensures compliance with the **MiniPay UX guidelines** and the criteria for **Celo Proof of Ship**.

---

## 📱 MiniPay UX Guidelines

Compliance with MiniPay design rules is mandatory to guarantee inclusion in the Opera MiniPay directory.

- [ ] **Seamless Auto-Connect:** The app detects and automatically logs in the user's Celo account context. No explicit "Connect Wallet" button should be required.
- [ ] **Zero Signing Interruptions:** Avoid requesting `personal_sign` or `eth_signTypedData` signatures during onboarding or transaction execution.
- [ ] **User-Friendly Identity:** Do not display raw hex wallet addresses (`0x...`) in the main UI layout; use shortened addresses (e.g., `0x12...56`) or user profiles.
- [ ] **Stablecoins Only:** Limit payments to **USDm**, **USDC**, and **USDT**. Hide native CELO staking options from users.
- [ ] **PT-BR Copy Alignment:** Ensure all copy uses: *taxa de rede*, *depositar*, *sacar*, *dólar digital*.
- [ ] **Responsive Dimensions:** Layout is fully responsive and fits a `360x640` mobile screen.
- [ ] **Asset Optimization:** Use `.svg` or `.webp` formats exclusively to keep payload sizes small and fast.
- [ ] **Low Balance Fallbacks:** Prompt users with a clear deposit option or redirect via MiniPay deeplinks.
- [ ] **Legal & Compliance:** Provide visible footer links leading to Terms of Service, Privacy Policy, and Support pages.
- [ ] **Performance Standards:** Maintain PageSpeed Mobile Score $\ge 90$ with clean origin headers.

---

## ⚓ Proof of Ship Submission Rules

Requirements for program registration and weekly score evaluations.

- [ ] **Public Codebase:** Project code is open-source and active on GitHub.
- [ ] **Talent App Directory:** App profile is registered and updated on the [Talent App Portal](https://talentprotocol.com/).
- [ ] **Mainnet Deployment:** Pools contract is deployed to Celo Mainnet.
- [ ] **Verification:** Contract verification is complete on Celoscan.
- [ ] **Weekly Commits:** Continuous codebase edits and deployments demonstrate active shipping.
- [ ] **Proof of Humanity:** Builder's profile is verified with a valid Proof of Humanity credential.

---

## 📈 Traction & Metrics Tracking

Analytics metrics monitored via the `/stats` API page.

- [ ] **Active Users:** Daily Active Users (DAU) and Monthly Active Users (MAU).
- [ ] **Retention Ratios:** 1-day, 7-day, and 30-day user return rates.
- [ ] **Smart Contract Activity:** Call counts for `placeBet`, `claim`, and `refund`.
- [ ] **Financial Volume:** Total Value Locked (TVL) and betting volume split by stablecoin.
- [ ] **Protocol Sinks:** Collected protocol fees (treasury) and tokens sent to the burn sink.
- [ ] **Error Rates:** Transaction failure rate tracker.
