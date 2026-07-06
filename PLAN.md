# Orakick — MVP Plan

## Overview
Decentralized prediction market untuk World Cup 2026, powered by TxLINE real-time data feeds dengan on-chain settlement via Solana.

## Core Concept
User memasang prediksi (pakai USDC) pada outcome pertandingan. Dana di-escrow dalam PDA. Saat pertandingan selesai, smart contract memvalidasi hasil via CPI ke TxLINE `validate_stat`, lalu otomatis distribute winnings ke pemenang.

---

## Tech Stack
- **On-chain:** Anchor (Rust) — escrow program + CPI ke TxLINE validation
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Wallet:** @solana/wallet-adapter
- **Data Feed:** TxLINE SSE Stream (real-time scores, odds, events)
- **Network:** Devnet → Mainnet
- **Deployment:** Vercel (frontend), Solana Devnet (program)

---

## MVP Features (2 Weeks)

### Week 1: Foundation
- [ ] Solana program (Anchor)
  - Create market (per match)
  - Place prediction (deposit USDC ke escrow PDA)
  - Resolve market (CPI ke TxLINE validate_stat)
  - Claim winnings
- [ ] TxLINE integration
  - SSE stream consumer (scores, match events, odds)
  - Match schedule fetcher
  - Merkle proof storage/display
- [ ] Frontend — Core Pages
  - Landing page (hero, how it works, live matches)
  - Markets list (upcoming, live, resolved)
  - Match detail + prediction UI
  - Wallet connect

### Week 2: Polish & Deploy
- [ ] Frontend — Advanced
  - Real-time odds & score updates (SSE)
  - Verifiable receipt / Merkle proof viewer
  - User dashboard (my predictions, history, P&L)
  - Leaderboard
- [ ] Auto-market creation dari TxLINE match schedule
- [ ] Deploy ke Devnet (program + frontend)
- [ ] Demo video (Loom, max 5 min)
- [ ] Technical documentation

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │ Markets │  │ Live Feed│  │ Wallet + Predictions│ │
│  └────┬────┘  └────┬─────┘  └──────────┬──────────┘ │
│       │             │                    │            │
└───────┼─────────────┼────────────────────┼────────────┘
        │             │                    │
        ▼             ▼                    ▼
   ┌─────────┐  ┌──────────┐     ┌──────────────────┐
   │ TxLINE  │  │ TxLINE   │     │ Solana Program   │
   │ REST API│  │ SSE Stream│     │ (Anchor)         │
   │ Schedule│  │ Scores/   │     │ - create_market  │
   │ & Odds  │  │ Events    │     │ - place_bet      │
   └─────────┘  └──────────┘     │ - resolve_market │
                                  │ - claim_winnings │
                                  │ - CPI→TxLINE    │
                                  │   validate_stat  │
                                  └──────────────────┘
```

---

## Pages & UI Structure

1. **Landing Page** `/`
   - Hero: "Predict. Verify. Win." + CTA
   - Live matches ticker
   - How it works (3 steps)
   - Featured markets

2. **Markets** `/markets`
   - Filter: Upcoming / Live / Resolved
   - Cards: Team A vs B, odds, total pool, time
   - Search by team/match

3. **Match Detail** `/match/[id]`
   - Score (live via SSE)
   - Prediction options (Win A / Draw / Win B)
   - Amount input + place prediction
   - Current pool breakdown
   - Merkle proof viewer (after resolved)

4. **Dashboard** `/dashboard`
   - My active predictions
   - History (won/lost/pending)
   - Total P&L
   - Claim button for winnings

5. **Leaderboard** `/leaderboard`
   - Top predictors by profit
   - Win rate

---

## TxLINE Endpoints Used
- SSE Stream: Real-time scores & match events
- REST: Match schedule, odds
- Merkle Proofs: scores validation primitive
- On-chain: `validate_stat` instruction (CPI target)

---

## Submission Checklist
- [ ] Deployed on Devnet
- [ ] Demo video (Loom/YouTube, max 5 min)
- [ ] Public GitHub repo
- [ ] Working link to deployed site
- [ ] Technical documentation
- [ ] Feedback on TxLINE API experience
