"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ORAKICK_PROGRAM = "6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR";
const TXORACLE_PROGRAM = "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";
const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

interface Endpoint {
  name: string;
  proxied: string;
  upstream: string;
  desc: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    name: "Fixtures snapshot",
    proxied: "/txapi/fixtures",
    upstream: "/api/fixtures/snapshot",
    desc: "Full World Cup + Int'l Friendlies schedule with FixtureId, Participant1/2, StartTime, competition metadata.",
  },
  {
    name: "Odds snapshot",
    proxied: "/txapi/odds?fixtureId=…",
    upstream: "/api/odds/snapshot/{fixtureId}",
    desc: "Consensus 1X2 StablePrice odds per fixture. Used to seed implied probabilities.",
  },
  {
    name: "Score history",
    proxied: "internal only",
    upstream: "/api/scores/historical/{fixtureId}",
    desc: "Ordered list of score events for a fixture. Used server-side to look up the latest event sequence.",
  },
  {
    name: "Merkle stat proof",
    proxied: "/txapi/proofs/scores?fixtureId=…",
    upstream: "/api/scores/stat-validation?fixtureId=…&seq=…&statKeys=1,2",
    desc: "Returns the fixture summary + Merkle proof bundle that TxOracle.validate_stat consumes on-chain. Home & away goal keys are 1 and 2.",
  },
  {
    name: "Guest JWT",
    proxied: "server-only",
    upstream: "POST /auth/guest/start",
    desc: "Anonymous JWT for the data API. Auto-refreshed on 401.",
  },
  {
    name: "Subscription activation",
    proxied: "scripts/txline-subscribe.ts",
    upstream: "POST /api/token/activate",
    desc: "Exchanges an on-chain subscribe tx + wallet signature for a per-account API token.",
  },
];

const PIPELINE = [
  {
    step: "01",
    title: "Client fetches the Merkle proof bundle",
    detail:
      "Next.js API route /txapi/proofs/scores?fixtureId=… looks up the latest score-event seq, then calls /api/scores/stat-validation on TxLINE with statKeys=1,2 (Participant1_Score, Participant2_Score). The response contains: ScoresBatchSummary, fixtureProof, mainTreeProof, and two StatTerm objects with individual stat_proofs.",
  },
  {
    step: "02",
    title: "Client submits two validate_stat instructions in one Solana tx",
    detail:
      "src/lib/validateStat.ts constructs two Anchor instructions against the TxOracle program (6pW64gN1…yP2J). Each reads only the daily_scores_merkle_roots PDA — so the whole verification is a single fee-paying transaction that returns two booleans. Failing either proof aborts the tx.",
  },
  {
    step: "03",
    title: "Orakick.resolve_match(score_a, score_b) commits the outcome",
    detail:
      "With scores proved on-chain, src/lib/resolveMatch.ts calls Orakick's own resolve_match instruction using the verified scoreA/scoreB values. The MatchMarket account's status transitions to Resolved and its result field is set.",
  },
  {
    step: "04",
    title: "Winners claim USDC from the market vault",
    detail:
      "Every winning prediction PDA can call Orakick.claim_winnings. The program checks the prediction outcome against the resolved result, then transfers USDC from the vault (an ATA owned by the MatchMarket PDA) to the user's ATA using signer seeds.",
  },
];

export default function DocsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 pt-32 pb-20 w-full space-y-14">
        <header className="space-y-4">
          <div className="inline-block px-3 py-1 bg-forest/10 text-forest text-[10px] font-black rounded-full tracking-[0.2em] uppercase">
            Technical Documentation
          </div>
          <h1
            className="text-5xl font-black text-navy leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
            data-testid="docs-heading"
          >
            Orakick Technical <br />Architecture
          </h1>
          <p className="text-navy/50 text-lg leading-relaxed">
            How Orakick uses TxLINE Merkle proofs to settle a World Cup
            prediction market without a trusted operator, plus the exact
            endpoints and code paths judges can inspect.
          </p>
        </header>

        {/* Section 1 — data layer */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">
              01
            </span>
            Data layer: TxLINE endpoints
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-6">
            <p className="text-navy/70 leading-relaxed">
              Orakick uses TxLINE as the single source of truth for fixtures,
              odds, scores, and cryptographic proofs. Every request is
              proxied through a Next.js route (under <code className="text-forest bg-forest/10 px-1 rounded">/txapi/*</code>)
              that attaches the guest JWT plus the activated per-account API
              token from the environment.
            </p>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-navy uppercase tracking-widest">
                Endpoints in use
              </h4>
              <ul className="space-y-3">
                {ENDPOINTS.map((e) => (
                  <li
                    key={e.name}
                    className="bg-white/50 p-4 rounded-2xl border border-navy/5"
                    data-testid={`endpoint-${e.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex flex-wrap items-baseline gap-2 mb-1">
                      <span className="text-xs font-black text-forest">{e.name}</span>
                      <code className="text-[10px] text-navy/70 bg-navy/5 px-2 py-0.5 rounded font-mono">
                        {e.proxied}
                      </code>
                      <span className="text-[9px] text-navy/40">→</span>
                      <code className="text-[10px] text-navy/60 font-mono">
                        {e.upstream}
                      </code>
                    </div>
                    <p className="text-[11px] text-navy/60 leading-snug">{e.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2 — settlement */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">
              02
            </span>
            Trustless settlement pipeline
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-6">
            <p className="text-navy/70 leading-relaxed">
              A single resolve action produces two auditable Solana
              transactions. Any reviewer can independently replay the Merkle
              verification against the on-chain{" "}
              <code className="text-forest bg-forest/10 px-1 rounded">
                daily_scores_merkle_roots
              </code>{" "}
              PDA — no operator trust is required.
            </p>

            <ol className="space-y-4">
              {PIPELINE.map((p) => (
                <li
                  key={p.step}
                  className="flex gap-4 bg-white/40 p-5 rounded-2xl border border-navy/5"
                  data-testid={`pipeline-step-${p.step}`}
                >
                  <div className="shrink-0 w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center text-xs font-black">
                    {p.step}
                  </div>
                  <div>
                    <p className="text-sm font-black text-navy leading-tight mb-1">
                      {p.title}
                    </p>
                    <p className="text-xs text-navy/60 leading-relaxed">{p.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="bg-golden/10 border border-golden/30 rounded-2xl p-4 text-xs text-navy/70 leading-relaxed">
              <strong className="text-golden">Trust note.</strong> The
              current Orakick program's <code className="font-mono">resolve_match</code>{" "}
              still accepts an authority signer, so trustlessness depends on
              the client running <code className="font-mono">validate_stat</code>{" "}
              first. The next iteration folds{" "}
              <code className="font-mono">validate_stat</code> into an
              on-program CPI so the contract itself refuses to resolve
              without valid proofs. See the roadmap section of the README.
            </div>
          </div>
        </section>

        {/* Section 3 — on-chain contracts */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">
              03
            </span>
            On-chain programs & mints (devnet)
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-4">
            <ul className="space-y-2 font-mono text-xs">
              <li className="flex justify-between gap-4 items-center bg-white/40 p-3 rounded-xl">
                <span className="text-navy/60">Orakick program</span>
                <a
                  href={`https://explorer.solana.com/address/${ORAKICK_PROGRAM}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest font-bold break-all hover:underline"
                >
                  {ORAKICK_PROGRAM}
                </a>
              </li>
              <li className="flex justify-between gap-4 items-center bg-white/40 p-3 rounded-xl">
                <span className="text-navy/60">TxOracle program</span>
                <a
                  href={`https://explorer.solana.com/address/${TXORACLE_PROGRAM}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest font-bold break-all hover:underline"
                >
                  {TXORACLE_PROGRAM}
                </a>
              </li>
              <li className="flex justify-between gap-4 items-center bg-white/40 p-3 rounded-xl">
                <span className="text-navy/60">USDC mint (devnet)</span>
                <a
                  href={`https://explorer.solana.com/address/${USDC_MINT}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest font-bold break-all hover:underline"
                >
                  {USDC_MINT}
                </a>
              </li>
            </ul>
            <div className="pt-3 border-t border-navy/5 text-xs text-navy/60 leading-relaxed">
              Orakick's Anchor instructions:{" "}
              <code className="text-forest bg-forest/10 px-1 rounded">create_match</code>,{" "}
              <code className="text-forest bg-forest/10 px-1 rounded">place_prediction</code>,{" "}
              <code className="text-forest bg-forest/10 px-1 rounded">resolve_match</code>,{" "}
              <code className="text-forest bg-forest/10 px-1 rounded">claim_winnings</code>.
              The USDC vault is an ATA owned by the MatchMarket PDA — signer
              seeds live inside the program so nobody can pull vault funds
              without a resolved outcome.
            </div>
          </div>
        </section>

        {/* Section 4 — how to reproduce */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">
              04
            </span>
            How to reproduce a full settlement
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-4 text-navy/70 leading-relaxed text-sm">
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                Connect a Phantom wallet on devnet with ≥ 0.1 SOL and some
                devnet USDC (Circle faucet:{" "}
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest font-bold hover:underline"
                >
                  faucet.circle.com
                </a>
                ).
              </li>
              <li>
                Go to <code className="text-forest">/markets</code>, select a
                fixture, pick a market (Winner, O/U 2.5, or Correct Score),
                enter a USDC amount, click PLACE BUY ORDER, and confirm the tx.
              </li>
              <li>
                Once the match ends, open{" "}
                <code className="text-forest">/admin/resolve</code>. Turn
                Demo mode OFF, enter the Orakick match id and TxLINE fixture
                id, click Run Resolution. The console shows the three
                pipeline steps live, each linking to Solana Explorer.
              </li>
              <li>
                As a winner, open <code className="text-forest">/profile</code>{" "}
                and click <strong>Claim USDC</strong> on any winning card.
                The USDC transfer signature will appear in the alert; you
                can inspect it on Solana Explorer.
              </li>
            </ol>
            <p className="text-xs text-navy/50">
              Because the 2026 World Cup kicks off after the hackathon
              deadline, TxLINE's proof endpoint legitimately returns 404
              until real scores are published. Judges can walk the same flow
              in Demo mode — the resolve tx and the claim tx are still real
              on-chain settlements.
            </p>
          </div>
        </section>

        {/* Section 5 — implied probability */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">
              05
            </span>
            Implied probability & AI Coach
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-4">
            <p className="text-navy/70 leading-relaxed">
              Orakick converts TxLINE StablePrice odds into implied
              probabilities and feeds them, along with fixture context, into
              Gemini 2.0 Flash via a Next.js API route. The AI Coach
              highlights value inefficiencies and volatility swings while
              the market runs.
            </p>
            <div className="flex gap-4">
              <div className="flex-1 bg-forest/5 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-forest uppercase">Formula</p>
                <p className="text-sm font-black text-navy">1 / odds × 100</p>
              </div>
              <div className="flex-1 bg-navy/5 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-navy/40 uppercase">Model</p>
                <p className="text-sm font-black text-navy">Gemini 2.0 Flash</p>
              </div>
            </div>
          </div>
        </section>

        <div className="pt-10 border-t border-navy/5 flex flex-wrap gap-4 justify-center">
          <a
            href="/markets"
            data-testid="cta-launch-markets"
            className="inline-block px-8 py-4 bg-forest text-white font-black rounded-full shadow-2xl shadow-forest/20 hover:scale-105 transition-all"
          >
            LAUNCH TRADING DASHBOARD
          </a>
          <a
            href="/admin/resolve"
            data-testid="cta-open-resolve"
            className="inline-block px-8 py-4 bg-white/60 text-navy font-black rounded-full border border-navy/10 hover:bg-white/80 transition-all"
          >
            OPEN RESOLVE CONSOLE
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
