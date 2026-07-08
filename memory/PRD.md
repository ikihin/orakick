# Orakick — Prediction Market (Bug Fixes)

## Problem statement (Jul 2026)
User request (Indonesian): "This web on GitHub still has many errors, please fix them.
Background and logo should NOT be changed."

Repo: https://github.com/ikihin/orakick.git

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (glassmorphism)
- Solana devnet (Anchor / @solana/web3.js) — on-chain predictions
- Recharts, TxLINE fixtures/odds oracle
- LocalStorage for per-wallet username

## Bugs fixed (this session)
1. Custom ball cursor — added `/public/ball-cursor.svg` and applied via
   `cursor: url(...)` in `src/app/globals.css` (both default and pointer states).
2. Reconnect same wallet re-asking for username — `src/components/Navbar.tsx`
   `useEffect` now explicitly:
   - Sets `showUsernameModal(false)` and applies saved username when localStorage
     has the entry.
   - Clears modal state, temp input, and username on disconnect.
3. Boxes more glossy/transparent (backgrounds/logo untouched) — updated `.glass`
   in `globals.css` to a translucent linear-gradient with backdrop-blur 22px +
   saturate 180% and glossy inset highlights. Added custom scrollbar utilities.
4. "Can't predict more than one match" — `src/app/markets/page.tsx`:
   - Added `matchId?: number` to `PredictionRecord`.
   - Set `matchId` on newly placed predictions.
   - Replaced the buggy team-name-substring check with
     `myPredictions.some(p => p.matchId === selectedMatch)`.

## Infra changes
- Upgraded system Node to v22 (Next.js 16 requires ≥22).
- Symlinked `/app/frontend` → `/app/web` so supervisor's read-only
  `frontend` program picks up the Next.js codebase.
- Changed `web/package.json` "start" to `next dev --hostname 0.0.0.0 --port 3000`.
- Extended `web/next.config.ts` `allowedDevOrigins` with the preview host and
  Emergent wildcards.

## Backlog / Next
- Wire on-chain fetched predictions to include a stable `matchId` so
  post-refresh dedupe is consistent.
- Replace `alert()` prompts with in-app glass toasts.
- Optional: hero/markets background music toggle.

## Code Review Fixes (this session)
- **Empty catch blocks** now log with `console.error/warn` and context:
  - `src/lib/txline.ts` (stream JSON parse)
  - `src/components/AICoach.tsx` (live advice fetch)
  - `src/app/api/ai-coach/ask/route.ts` (Gemini call + top-level)
  - `src/app/profile/page.tsx` (Prediction decode)
  - `src/app/markets/page.tsx` (Prediction decode, per-fixture odds, TxLINE fallback)
- **Stable React keys** (replaced index-as-key):
  - `profile/page.tsx` uses `pred.txSig`
  - `markets/page.tsx` outcomes use `row.id`, chat uses generated `id`, recent
    trades use `pred.txSig`
  - Chat state typed and each message now has an `id`
- **useMemo** for expensive JSX computations on profile page (`netProfit`,
  `totalLoss`).
- **console.log guarded** by `process.env.NODE_ENV !== "production"` in
  `src/lib/placeBet.ts`.
- **Hook deps**: added `wallet` to markets `fetchMyPredictions` effect;
  Navbar's localStorage-sync effect annotated with an explicit
  `eslint-disable-next-line react-hooks/set-state-in-effect` because
  localStorage is not a React state source.

### Intentionally deferred (from the review report)
- **localStorage → cookies/session** for the username: the value is a
  cosmetic per-wallet nickname, not an auth token or sensitive PII — moving
  it to HttpOnly cookies would add a backend dependency without a real
  security benefit. Kept in localStorage.
- **Full refactor of `MarketsPage`** (935 lines → 5-7 components) and other
  complexity reductions in `useOrakick.ts`, `api/ai-coach/*` fallback
  functions: large risky refactor with no functional gain right now. Left
  for a dedicated refactor pass.
- **Bulk removal of `any`** in `placeBet.ts` / `WalletProvider.tsx` /
  `useOrakick.ts`: Anchor + wallet-adapter surfaces are typed loosely
  upstream; typing them properly is a separate cleanup task.
