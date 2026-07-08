# Orakick

**Trustless FIFA World Cup 2026 prediction market on Solana devnet, settled by
TxLINE Merkle proofs.**

Pick a match → stake USDC → after the match ends anyone can trigger the
resolve pipeline: `TxOracle.validate_stat` verifies the home & away goals
directly against the on-chain Merkle root, and Orakick's `resolve_match`
locks in the outcome. Winners claim USDC from the market vault, all
non-custodial.

- Live app: <https://orakick.vercel.app> _(replace after Vercel deploy)_
- Repo: <https://github.com/ikihin/orakick>
- Demo video: _(add Loom/YouTube link)_

## Track: TxLINE World Cup Data (Superteam Earn)

Orakick uses TxLINE as the **primary data source** for fixtures, live scores,
odds, and — most importantly — the Merkle proofs that let a smart-contract
market settle without a trusted admin.

## Architecture

```
                 ┌──────────────────────────────────────────┐
                 │              TxLINE REST API             │
                 │  fixtures  •  odds  •  scores  •  proofs │
                 └────────────┬────────────────┬────────────┘
                              │                │
                              ▼                ▼
        ┌─────────────────────────────────────────────────┐
        │        Orakick Next.js frontend (port 3000)     │
        │   /markets   /profile   /admin/resolve   /docs  │
        │            Next.js API routes at /txapi/*       │
        └────────┬────────────────────┬───────────────────┘
                 │                    │
                 │  place / claim     │  validate + resolve
                 ▼                    ▼
     ┌─────────────────────┐   ┌───────────────────────────┐
     │  Orakick program    │   │  TxOracle program (devnet) │
     │  6cZmF2R…nnKPR      │   │  6pW64gN1…yP2J             │
     │  ─────────────────  │   │  ────────────────────────  │
     │  create_match       │   │  subscribe                 │
     │  place_prediction   │   │  validate_stat  → bool     │
     │  resolve_match      │   │  daily_scores_merkle_roots │
     │  claim_winnings     │   └───────────────────────────┘
     │  vault: USDC ATA    │
     └─────────────────────┘
```

### Settlement pipeline (`/admin/resolve`)

1. `GET /txapi/proofs/scores?fixtureId=…` proxies TxLINE. The route calls
   `/api/scores/historical/{fixtureId}` to find the latest scores event seq
   for that fixture, then requests
   `/api/scores/stat-validation?fixtureId=…&seq=…&statKeys=1,2` to receive
   the full Merkle bundle (`ScoresBatchSummary`, `fixtureProof`,
   `mainTreeProof`, plus two `StatTerm`s for home & away goals).
2. Client builds **two `validate_stat` instructions** on the TxOracle
   program (one per team's goal count) and sends them in a single Solana
   transaction. Each instruction returns `bool` and reads only
   `daily_scores_merkle_roots` — **TX #1 is the audit trail**.
3. If both proofs pass, the client calls `Orakick.resolve_match(score_a,
   score_b)` — **TX #2** — using the values that TxOracle just proved.
4. Winners open `/profile` and click Claim → `Orakick.claim_winnings`
   transfers USDC from the market vault PDA to the user's ATA.

Both TX signatures are surfaced in the UI with links to Solana Explorer so
anyone can independently replay the Merkle verification.

> **Trust note.** The Orakick program's `resolve_match` still requires an
> authority signer today, so full trustlessness relies on the client
> actually running `validate_stat` before resolving. The next iteration
> folds `validate_stat` into an on-program CPI so the contract itself
> refuses to resolve without valid proofs. See the roadmap section.

## TxLINE endpoints used

| TxLINE endpoint | Purpose | Wired into |
|---|---|---|
| `POST /auth/guest/start` | Guest JWT | `scripts/txline-subscribe.ts`, `src/app/txapi/*/route.ts` |
| `POST /api/token/activate` | Subscription activation (Solana signature) | `scripts/txline-subscribe.ts` |
| `GET  /api/fixtures/snapshot` | Match schedule | `src/app/txapi/fixtures/route.ts` |
| `GET  /api/odds/snapshot/{fixtureId}` | 1X2 odds snapshot | `src/app/txapi/odds/route.ts` |
| `GET  /api/scores/historical/{fixtureId}` | Latest score-event `seq` lookup | `src/app/txapi/proofs/scores/route.ts` |
| `GET  /api/scores/stat-validation` | Merkle proof bundle for validate_stat | `src/app/txapi/proofs/scores/route.ts` |

## Solana programs & mints (devnet)

| Program / mint | Address |
|---|---|
| Orakick (this repo) | `6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR` |
| TxOracle | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| USDC (test mint used by Orakick vault) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| TxL token mint (subscription) | `4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG` |

## Running locally

```bash
cd web
yarn install       # requires Node ≥ 22 (Next.js 16)
yarn dev
```

The app boots on <http://localhost:3000>. Live TxLINE data requires the
one-time subscription flow below.

### One-time TxLINE devnet subscription

The free service level 1 (World Cup + International Friendlies, 60-second
delay) costs 0 TxL — you only need enough SOL for the `subscribe`
transaction fees (~0.01 SOL).

```bash
# Ensure you have a keypair with ≥0.5 devnet SOL:
#   solana-keygen new --outfile ~/.config/solana/id.json
#   solana airdrop 2 --url devnet
#   (or send SOL from another wallet)

cd web
npx tsx scripts/txline-subscribe.ts
```

The script performs the full four-step flow from
[TxLINE's quickstart](https://txline.txodds.com/documentation/worldcup):

1. Calls `TxOracle.subscribe(service_level_id=1, weeks=4)` on-chain.
2. Fetches a guest JWT from `/auth/guest/start`.
3. Signs the activation message `${txSig}::${jwt}` with the keypair.
4. POSTs to `/api/token/activate`.

The returned `TXLINE_API_TOKEN`, `TXLINE_JWT`, and `TXLINE_NETWORK` are
written to `web/.env.local`. Restart the dev server (`sudo supervisorctl
restart frontend` in this environment, or Ctrl-C + `yarn dev` locally) to
pick them up.

### Anchor program

```bash
cd contract
anchor build
anchor deploy --provider.cluster devnet
```

Program source: `contract/programs/contract/src/lib.rs`.

## Why routes live at `/txapi/*` instead of `/api/*`

The hosted preview environment routes any request beginning with `/api/*`
to a separate FastAPI port. Since Orakick is a Next.js-only app, we expose
our route handlers under `/txapi/*` so the ingress delivers them to Next.js
on port 3000. If you self-host without that ingress rule you can rename the
folder back to `src/app/api/*` and update the client fetches — the code is
otherwise identical.

## Demo mode

Because World Cup 2026 kicks off after the hackathon deadline, TxLINE's
proof endpoint legitimately returns 404 (no scores yet). The
`/admin/resolve` console ships with a **Demo mode** toggle that skips the
two `validate_stat` calls and lets a judge drive `Orakick.resolve_match`
with manually-entered scores so the resolve → claim path can be walked
end-to-end during the demo video.

`/txapi/proofs/scores?fixtureId=…&demo=1` also returns a deterministic
sample payload with the exact shape TxLINE returns, useful for the proof
viewer modal on `/profile`.

Toggle demo off and provide a fixture that has scores (after any real
match plays) to run the fully-trustless pipeline.

## Feature checklist

- [x] Live TxLINE fixtures and odds snapshots (`/txapi/fixtures`, `/txapi/odds`)
- [x] Guest JWT + activated API token pipeline (`scripts/txline-subscribe.ts`)
- [x] On-chain market creation, USDC stake escrow, pool bookkeeping (Anchor)
- [x] Client-driven `validate_stat` × 2 in a single Solana tx
- [x] `Orakick.resolve_match` gated on client-verified scores
- [x] USDC payout via `claim_winnings` + vault PDA signer
- [x] Live Merkle proof viewer per prediction (`/profile` modal)
- [x] Explorer links for every settlement leg
- [x] AI Coach (Gemini) contextual analysis
- [ ] Anchor CPI: fold `validate_stat` into `resolve_match` on-program
      (requires redeploy — planned as v1.1)
- [ ] SSE stream for real-time odds & scores (currently REST snapshots)
- [ ] Full 104-match tournament bracket with auto-created markets
- [ ] Keeper bot for auto-resolve on scores stream

## Feedback for TxLINE

- **Loved.** The uniform JSON schema across fixtures / odds / scores made
  it trivial to build a single UI that handles any competition. The guest
  JWT bootstrap plus `subscribe`-then-`activate` is a nice zero-payment
  onboarding for the free tier. And having the daily scores Merkle roots
  living on-chain means we can hand the proof + a Solana tx sig to any
  reviewer for independent verification, no operator trust required.
- **Friction.**
  1. The proof endpoint discovery was the biggest slow-down. The docs
     mention "Merkle proofs" but the exact path
     (`/api/scores/stat-validation`) and required `seq` parameter only
     surface inside the OpenAPI spec. A pointer from the World Cup page
     directly to the `stat-validation` reference (or a compact
     "how to build a proof" page) would save a lot of time.
  2. A `/programs/{network}/idl.json` download endpoint (instead of a
     copy-paste block on the docs page) would let us fetch the IDL at
     build time and stay in sync with releases.
  3. `subscribe` requires the TxL token ATA to exist even when the free
     tier costs 0 TxL. The setup script has to call
     `getOrCreateAssociatedTokenAccount` on the Token-2022 program first
     — a small friction that a dedicated `subscribe_free_tier` helper
     could remove.

## License

MIT.
