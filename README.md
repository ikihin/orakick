# Orakick — AI-Powered World Cup Prediction Market on Solana

Orakick is a decentralized prediction market for the FIFA World Cup 2026, powered by live oracle data from TxLINE and AI-driven insights. Users can predict match outcomes, place on-chain bets with USDC, and claim winnings — all verified trustlessly on Solana.

## Features

- **On-Chain Predictions** — Place predictions (Match Winner, Over/Under, Correct Score) settled on Solana devnet with USDC
- **TxLINE Oracle Integration** — Live match data and odds from the TxLINE decentralized sports oracle
- **AI Coach** — Real-time match analysis powered by Gemini AI with TxLINE odds data. Ask questions, get tactical insights
- **Phantom Wallet** — Connect, sign, and track your predictions directly from the browser
- **Auto Market Creation** — Match markets are created on-chain automatically when the first user predicts
- **My Predictions** — On-chain history fetched directly from Solana program accounts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana (devnet) |
| Smart Contract | Anchor 0.31.1 (Rust) |
| Oracle | TxLINE (decentralized sports data) |
| Frontend | Next.js 16, React, Tailwind CSS |
| AI | Google Gemini 2.0 Flash + odds-based fallback |
| Wallet | Phantom via @solana/wallet-adapter |
| Token | USDC (devnet mint) |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  Next.js API │────▶│  TxLINE Oracle  │
│  (React)    │     │   Routes     │     │  (Live Odds)    │
└──────┬──────┘     └──────┬───────┘     └─────────────────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │  Gemini AI   │
       │            │  (Analysis)  │
       │            └──────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│         Solana Devnet                │
│  Program: 6cZmF2RJSN2KmYvCDLeiq...  │
│  - create_match                      │
│  - place_prediction (USDC transfer)  │
│  - resolve_match                     │
│  - claim_winnings                    │
└──────────────────────────────────────┘
```

## Program ID

```
6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR
```

## Getting Started

### Prerequisites

- Node.js 18+
- Phantom wallet (set to devnet)
- Devnet SOL (for tx fees)
- Devnet USDC (for predictions)

### Setup

```bash
# Clone
git clone https://github.com/ikihin/orakick.git
cd orakick/web

# Install dependencies
npm install

# Environment variables
cp .env.example .env.local
# Fill in: TXLINE_JWT, TXLINE_API_TOKEN, GEMINI_API_KEY

# Run development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TXLINE_JWT` | JWT token from TxLINE guest auth |
| `TXLINE_API_TOKEN` | API token from TxLINE subscription |
| `TXLINE_NETWORK` | `devnet` or `mainnet` |
| `GEMINI_API_KEY` | Google AI Studio API key (free tier) |

## Smart Contract

The Anchor program handles:

- **create_match** — Initialize a match market PDA with teams, kickoff time
- **place_prediction** — Transfer USDC to vault, record prediction type
- **resolve_match** — Authority sets final score, determines result
- **claim_winnings** — Winners withdraw proportional share from vault

Seeds: `["match_market", match_id_le_bytes]` for markets, `["prediction", market_key, user_key]` for predictions.

## AI Coach

The AI Coach provides:

1. **Auto-analysis** — When you select a match, odds are analyzed for implied probability, value bets, and risk level
2. **Ask Coach** — Interactive Q&A about specific betting strategies (Over/Under, value picks, safest bets)
3. **Dual engine** — Gemini AI for natural language insights, with intelligent odds-based fallback

## License

MIT
