# Orakick

**Trustless prediction market for the FIFA World Cup 2026 on Solana devnet, settled by TxLINE cryptographic Merkle proofs.**

Pick a match → stake USDC → on match end, anyone triggers on-chain
`TxOracle.validate_stat` with the fixture's Merkle proof, and Orakick's
`resolve_match` locks in the score. Winners claim USDC from the escrow
vault, all trustless.

- Live app: <https://orakick.vercel.app> _(replace after deploy)_
- Repo: <https://github.com/ikihin/orakick>
- Demo video: _(add Loom/YouTube link)_

## Track: TxLINE World Cup Data (Superteam Earn)

This project is submitted to the TxLINE World Cup hackathon. Orakick uses
TxLINE as the **primary data source** for fixtures, live scores, odds, and
— most importantly — Merkle proofs that let smart contracts settle
prediction markets without a trusted admin.

## Architecture

```
                 ┌──────────────────────────────────────────┐
                 │              TxLINE REST + SSE           │
                 │  fixtures  •  odds  •  scores  •  proofs │
                 └────────────┬────────────────┬─────────────┘
                              │                │
                              ▼                ▼
        ┌────────────────────────────────────────────────┐
        │           Orakick Next.js Frontend             │
        │  /markets  /profile  /admin/resolve  /docs     │
        └────────┬───────────────────┬───────────────────┘
                 │                   │
                 │ place / claim     │ validate + resolve
                 ▼                   ▼
        ┌───────────────────┐  ┌─────────────────────────────┐
        │  Orakick program  │  │  TxOracle program (devnet)  │
        │ 6cZmF2R…nnKPR     │  │ 6pW64gN1…yP2J               │
        │  create_match     │  │  validate_stat  (returns bool)│
        │  place_prediction │  │  daily_scores_merkle_roots  │
        │  resolve_match    │  └─────────────────────────────┘
        │  claim_winnings   │
        │  vault: USDC ATA  │
        └───────────────────┘
```

### Settlement pipeline (`/admin/resolve`)

1. `GET /api/proofs/scores?fixtureId=...` proxies TxLINE and returns the
   fixture Merkle bundle (`ScoresBatchSummary`, `fixtureProof`,
   `mainTreeProof`, two `StatTerm`s for home & away goals).
2. Client builds two `validate_stat` instructions on the TxOracle program
   (one per team's goal count), sends them in a single Solana transaction
   → returns `bool` for each proof. TX #1 = **audit trail**.
3. If both proofs verify, client calls `Orakick.resolve_match(score_a,
   score_b)` → TX #2 sets the market's outcome on-chain.
4. Winners can now claim from `/profile` via `Orakick.claim_winnings`;
   Orakick releases USDC from the market vault PDA.

Both signatures are surfaced in the UI and linked to Solana Explorer so
anyone can independently replay the Merkle verification.

## TxLINE endpoints used

| Endpoint | Purpose | Route in our app |
|---|---|---|
| `POST /auth/guest/start` | Guest JWT | `src/lib/txline.ts` |
| `GET /api/fixtures/snapshot` | Match schedule | `src/app/api/fixtures/route.ts` |
| `GET /api/odds/snapshot/{fixtureId}` | Current 1X2 odds | `src/app/api/odds/route.ts` |
| `GET /api/scores/proofs/{fixtureId}` | Merkle proof bundle | `src/app/api/proofs/scores/route.ts` |
| `POST /api/token/activate` | Subscription activation | `src/lib/txline-setup.ts` |

## Solana programs

| Program | Devnet address |
|---|---|
| Orakick (this repo) | `6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR` |
| TxOracle | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| USDC devnet mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

## Running locally

```bash
cd web
yarn install
cp .env.example .env.local
# fill TXLINE_API_TOKEN after activation (see /docs/txline-setup)
yarn dev
```

Requires Node ≥ 22 (Next.js 16).

Anchor program lives in `../contract/programs/contract/src/lib.rs`.
Build with:

```bash
cd contract
anchor build
anchor deploy --provider.cluster devnet
```

## Demo mode

Because a fresh clone won't have a live TxLINE subscription, the
`/admin/resolve` console ships with a **Demo mode** toggle. Demo mode
skips the two on-chain `validate_stat` calls and drives
`Orakick.resolve_match` with manually-entered scores so reviewers can
walk through the resolve → claim flow without provisioning TxLINE
credentials. Toggle demo off and set `TXLINE_API_TOKEN` in
`web/.env.local` to run the fully trustless pipeline.

## Feature checklist

- [x] Real-time TxLINE fixtures / odds / scores integration
- [x] On-chain match creation, stake, pool bookkeeping (Anchor)
- [x] `validate_stat` client-driven CPI equivalent (two proofs / tx)
- [x] Trustless `resolve_match` gated by verified scores
- [x] USDC payout via `claim_winnings` and vault PDA signer
- [x] Live Merkle proof viewer per prediction
- [x] Explorer links for every settlement leg
- [x] AI Coach (Gemini) contextual analysis
- [ ] Anchor CPI: fold `validate_stat` into `resolve_match` on-program
      (planned — requires redeploy)
- [ ] Full 104-match tournament bracket
- [ ] Keeper bot for auto-resolve on scores stream

## Feedback for TxLINE

- **Loved:** Uniform JSON schema across fixtures/odds/scores, the guest
  JWT flow is a nice quickstart, and having the daily scores Merkle roots
  living on-chain means we don't have to trust any operator — just replay
  the proof.
- **Friction:** Discoverability of the exact proof endpoint took time
  (docs mention "proofs" but the endpoint path only shows up inside the
  OpenAPI spec). A single `programs/{network}/idl` JSON download link
  would beat copy-pasting from the docs page.

## License

MIT.
