# Tocktify — Session Handoff Brief

**Date:** June 11, 2026 · **From:** Claude Code (cloud session) · **For:** continuation on CEO's laptop
**Branch with all work:** `claude/tocktify-marketing-growth-xeeldj` on `idbac25/Bayzara`

---

## How to continue this work on the laptop

```bash
git fetch origin claude/tocktify-marketing-growth-xeeldj
git checkout claude/tocktify-marketing-growth-xeeldj
```

Then start Claude Code in the repo and open with a prompt like:

> "Read everything in the `marketing/` folder, starting with
> SESSION-BRIEF.md — it's the handoff from a previous session where we
> built Tocktify's growth plan to August 1. Continue from the open items
> in section 6."

Everything below is also in that folder; this brief exists so no context
from the conversation is lost.

## 1. The company and the situation

- **Tocktify (tocktify.com)** — "Shopify for Somalia/East Africa." SaaS
  platform where entrepreneurs upload products, create social tracking
  links, capture payments online, and get paid out automatically every
  24 hours.
- **Paypoint** — the company's own payment gateway, aggregating Somali
  mobile money (EVC Plus, eDahab, wallets), serving the unbanked.
- **Team:** CEO + 3 employees. **Marketing budget: $500 to Aug 1.**
- **Goal as stated:** 10,000 users by August 1, 2026.
- **Channels:** TikTok @tocktify.com (~3,177 followers, 8,161 likes, bio
  "Post Get paid. Sell on TikTok. Get paid via EVC, eDahab and Wallet");
  YouTube @Tocktify (~448 subs, 4 videos, 7 days old, ~£15 spent on
  boosts; subs mostly Kenya/Uganda/Tanzania + US diaspora — Somalia
  cannot be targeted by YouTube/TikTok ads, only boost spillover).
- **Live sellers (2):** Ahmed "Banana Bully" (online bakery/cakes) and
  Sahel Drops (grocery). A 4-part documentary exists; Part 1 is live on
  YouTube ("The Last Winter", ~1.2K views) with an English version.
- **Boost economics:** TikTok ~$9 → 10–20K views ($1/day × 6–7 days);
  YouTube boosts also available and cheap.
- **The repo (Bayzara)** is the product codebase: Next.js + Supabase,
  EN/SO localization, shop features, SMS recorder backend + Android APK
  (payment-SMS ingestion), Vercel deploy. The team controls the product
  and can ship growth features.

## 2. Facts the CEO confirmed in Q&A (load-bearing for the strategy)

1. **Goal metric:** "10,000" is not strictly defined — CEO accepted a
   recommendation (see §3).
2. **Onboarding:** currently **concierge** (manual, done twice ever).
   Founders are debating self-signup + **$2 seven-day trial**.
3. **Pricing:** $39/month, $170/6 months, $300/year.
4. **KYC reality:** every seller needs their **own business license and
   own Hormuud merchant account** (plus SMS gateway connection) — no
   master-merchant aggregation. This is the growth bottleneck.
5. **Capacity:** unknown — never measured. (Week-0 task: onboard 3
   sellers with a stopwatch.)
6. **Target sellers:** existing social/DM sellers + Somali diaspora +
   Somalia-based sellers (all three).
7. **Budget flexibility:** $500 can fund boosts AND incentives
   (free months, referral rewards, giveaways).
8. **Content capacity:** daily content possible (team of 3).
9. **Ahmed & Sahel:** will appear in content but will NOT share revenue
   numbers publicly (use order counts, not dollar figures).

## 3. Strategy decided (full detail in GROWTH-PLAN.md)

- **Core insight:** the bottleneck is onboarding throughput, not
  attention. 10,000 *paying* sellers in 7 weeks (~$390K MRR) is
  impossible; chasing it would burn budget and reputation.
- **Reframed goal:** *10,000 people in the funnel* (followers + waitlist
  + WhatsApp community) feeding a **"Founding 100"** cohort of paying,
  concierge-onboarded sellers. Targets: 2,500+ waitlist, 100 paying
  sellers, 30 with first sale (~$3,900 MRR) by Aug 1.
- **Positioning:** "The enemy is the DM" — target people already selling
  via TikTok/WhatsApp DMs and payment screenshots. Don't teach a new
  behavior; remove friction from an existing one.
- **The bottleneck becomes the offer:** Founding 100 = done-with-you
  licensing + Hormuud merchant setup + store build, founding price
  locked, only 100 places (real scarcity, honest urgency).
- **Diaspora wedge:** "Order in Minneapolis, deliver in Mogadishu."
  Diaspora = buyers + sponsors ("$300/year for your family's store") +
  referrers; also the only ad-targetable segment (Minneapolis, London,
  Toronto, Eastleigh, Stockholm, Columbus).
- **Podcast verdict:** no standalone podcast yet. Weekly **"Suuq Live"**
  TikTok Live (Thu 8:30pm EAT, re-upped to YouTube), seller guest each
  week, clipped into 3–5 shorts. Revisit podcast after August.
- **$2 trial decision:** ship it as a "setup deposit credited to month
  one" — but never gate the demo store on it.
- **Budget split:** $280 TikTok boosts (winners only; kill >$0.50 per
  waitlist signup, scale <$0.20) · $60 YouTube (doc parts to East
  Africa + diaspora) · $100 incentives (incl. "free year for best
  'what I'd sell' stitch" UGC giveaway) · $60 reserve.
- **Product asks (priority order):** ① viral waitlist page with referral
  queue-jumping ② **demo store / sandbox mode** (build & share a store
  pre-KYC; "activate payments" = Founding 100 application) — single
  highest-leverage build ③ fix tocktify.com returning **403 to
  crawlers** (breaks Google + WhatsApp/TikTok link previews; check
  Vercel/WAF bot rules) + OpenGraph tags ④ "runs on Tocktify" badges on
  Ahmed/Sahel storefronts ⑤ in-product referral: 1 free month per
  paying referral, both sides.

## 4. Market facts the plan is built on (full detail in MARKET-CONTEXT.md)

~9% of Somalis have bank accounts but ~89% used mobile money in 2023
(~73% penetration); ~155M transactions/~$2.7B per month, USD-denominated,
SMS-confirmed. Wallets by territory: EVC Plus (Hormuud, south/central),
eDahab (Dahabshiil, nationwide), Zaad (Telesom, Somaliland), Sahal
(Golis, Puntland). No Stripe/PayPal/Shopify Payments in Somalia — wallet
aggregation is the moat. Remittances ~$1.6–2B/yr (~25% of GDP, 4th most
remittance-dependent country; ~$200–300/month per receiving household).
GDP/capita ~$450 → $39/mo must be sold as ROI, annual as a diaspora
product, $2 trial fits prepaid top-up culture. Median age ~17; women
dominate small trade; WhatsApp >> email; Somali-first content with EN
subs. 2025: national instant payments (SIPS/SOMQR) launched — tailwind.
**Never run "get rich online" framing** in this scam-aware market; the
payout-SMS-on-camera video is the strongest trust asset.

## 5. Deliverables already on the branch (`marketing/`)

| File | Contents |
|---|---|
| GROWTH-PLAN.md / .pdf | Strategy, funnel, goal reframe, budget, team allocation, KPIs, risks |
| MARKET-CONTEXT.md / .pdf | Somalia fintech deep-dive; every fact tied to a marketing decision |
| CONTENT-PLAYBOOK.md / .pdf | Pillars + weekly mix, **10 ready-to-shoot scripts (S1–S10, Somali+English)**, YouTube plan, Suuq Live rundown, boost playbook, zero-cost distribution |
| WEEK-BY-WEEK.md / .pdf | Dated calendar Jun 11 → Aug 1: weekly themes, posts, boosts, spend, targets; Monday scorecard template |
| SESSION-BRIEF.md / .pdf | This handoff document |

## 6. Open items / where to pick up

1. **CEO is reviewing the four documents** — feedback was promised but
   NOT yet given. First action in the new session: collect and apply it.
2. **Week-0 checklist is live now** (see WEEK-BY-WEEK.md): waitlist page,
   403/OpenGraph fix, WhatsApp Business setup, free-guide PDF v1, and
   the timed onboarding of 3 sellers (capacity number decides if
   "Founding 100" stays 100).
3. **Offered but not yet done:** waitlist landing-page copy (Somali +
   English); engineering spec for demo-store mode + referral system
   against this codebase. Both are natural next tasks for the laptop
   session, which has the full codebase locally.
4. **Founder decisions pending:** final go/no-go on $2 trial framing and
   self-signup; confirm Founding 100 pricing lock details.
5. Documentary Parts 2–4 release dates are set as the next three Fridays
   in the calendar — confirm the edit schedule supports that.
