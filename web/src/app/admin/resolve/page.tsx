"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { resolveMatchWithProof } from "@/lib/resolveMatch";
import type { ValidateStatResult } from "@/lib/validateStat";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { IDL } from "@/lib/idl";

const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
const TXORACLE_PROGRAM_ID = "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";

interface FlowStep {
  key: string;
  label: string;
  status: "idle" | "running" | "success" | "error";
  detail?: string;
  link?: string;
}

export default function AdminResolvePage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { connected, publicKey } = wallet;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [matchId, setMatchId] = useState("1");
  const [fixtureId, setFixtureId] = useState("");
  const [demoMode, setDemoMode] = useState(true);
  const [demoScoreA, setDemoScoreA] = useState("2");
  const [demoScoreB, setDemoScoreB] = useState("1");

  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [running, setRunning] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    validate?: ValidateStatResult;
    resolveTxSig: string;
    demoMode: boolean;
  } | null>(null);

  const updateStep = (key: string, patch: Partial<FlowStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s))
    );
  };

  async function handleResolve() {
    if (!connected || !publicKey) return;

    setRunning(true);
    setFinalResult(null);

    const initialSteps: FlowStep[] = demoMode
      ? [
          {
            key: "demo-note",
            label: "Demo mode — skipping TxOracle.validate_stat",
            status: "success",
            detail:
              "Live path fetches Merkle proof from TxLINE API and runs 2× validate_stat on-chain. Enable by unchecking Demo mode + setting TXLINE_API_TOKEN.",
          },
          {
            key: "resolve",
            label: "Orakick.resolve_match(score_a, score_b)",
            status: "idle",
          },
        ]
      : [
          {
            key: "fetch-proof",
            label: "Fetch Merkle proof bundle from TxLINE",
            status: "idle",
          },
          {
            key: "validate",
            label: "TxOracle.validate_stat × 2 (home + away goals)",
            status: "idle",
          },
          {
            key: "resolve",
            label: "Orakick.resolve_match(verifiedScoreA, verifiedScoreB)",
            status: "idle",
          },
        ];
    setSteps(initialSteps);

    try {
      if (demoMode) {
        // Skip validate_stat — call resolve_match directly with user-supplied scores.
        updateStep("resolve", { status: "running" });
        const provider = new AnchorProvider(connection, wallet as any, {
          commitment: "confirmed",
        });
        const program = new Program(IDL as any, provider);
        const matchIdBN = new BN(parseInt(matchId));
        const [matchMarket] = PublicKey.findProgramAddressSync(
          [Buffer.from("match_market"), matchIdBN.toArrayLike(Buffer, "le", 8)],
          PROGRAM_ID
        );
        const sig = await (program.methods as any)
          .resolveMatch(parseInt(demoScoreA), parseInt(demoScoreB))
          .accounts({ authority: publicKey, matchMarket })
          .rpc();
        await connection.confirmTransaction(sig, "confirmed");
        updateStep("resolve", {
          status: "success",
          detail: `Tx: ${sig.slice(0, 12)}...${sig.slice(-8)}`,
          link: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
        });
        setFinalResult({ resolveTxSig: sig, demoMode: true });
      } else {
        updateStep("fetch-proof", { status: "running" });
        // resolveMatchWithProof internally fetches + validates + resolves.
        // We split UI updates by wrapping.
        const result = await resolveMatchWithProof(
          connection,
          wallet as any,
          parseInt(matchId),
          parseInt(fixtureId)
        );
        updateStep("fetch-proof", { status: "success" });
        updateStep("validate", {
          status: "success",
          detail: `Verified ${result.validate.scoreA}-${result.validate.scoreB}. Root PDA: ${result.validate.rootPda.slice(0, 10)}...`,
          link: `https://explorer.solana.com/tx/${result.validate.txSignature}?cluster=devnet`,
        });
        updateStep("resolve", {
          status: "success",
          detail: `Tx: ${result.resolveTxSig.slice(0, 12)}...${result.resolveTxSig.slice(-8)}`,
          link: `https://explorer.solana.com/tx/${result.resolveTxSig}?cluster=devnet`,
        });
        setFinalResult({ ...result, demoMode: false });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Resolve failed:", err);
      setSteps((prev) => {
        const running = prev.findIndex((s) => s.status === "running");
        if (running >= 0) prev[running] = { ...prev[running], status: "error", detail: msg };
        return [...prev];
      });
    } finally {
      setRunning(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-cream relative">
      <div className="fixed inset-0 z-0">
        <img src="/markets-bg.png" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-cream/60" />
      </div>

      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-16 relative z-10 space-y-8">
        <div>
          <h1
            className="text-4xl font-black text-navy"
            style={{ fontFamily: "var(--font-playfair)" }}
            data-testid="admin-resolve-title"
          >
            Match Resolution Console
          </h1>
          <p className="text-navy/60 mt-2 max-w-2xl">
            Trustless settlement flow: Orakick client fetches the fixture&apos;s
            Merkle proof bundle from TxLINE, calls{" "}
            <code className="text-forest bg-forest/10 px-1.5 py-0.5 rounded text-xs">
              TxOracle.validate_stat
            </code>{" "}
            on-chain (Program{" "}
            <span className="text-[10px] font-mono">
              {TXORACLE_PROGRAM_ID.slice(0, 8)}...
            </span>
            ) twice — once per team&apos;s goal count — and only then commits
            <code className="text-forest bg-forest/10 px-1.5 py-0.5 rounded text-xs ml-1">
              Orakick.resolve_match
            </code>
            . Both signatures are recorded so anyone can independently replay
            the Merkle verification.
          </p>
        </div>

        {!connected ? (
          <div className="glass rounded-3xl p-12 text-center">
            <p className="text-navy/60">Connect your wallet to run resolution.</p>
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 space-y-6" data-testid="admin-resolve-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-navy/50 uppercase tracking-widest">
                  Match ID (Orakick)
                </label>
                <input
                  type="number"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  data-testid="input-match-id"
                  className="mt-2 w-full bg-white/60 border border-navy/10 rounded-xl px-4 py-3 text-navy font-bold outline-none focus:ring-2 ring-forest/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-navy/50 uppercase tracking-widest">
                  Fixture ID (TxLINE)
                </label>
                <input
                  type="number"
                  value={fixtureId}
                  onChange={(e) => setFixtureId(e.target.value)}
                  placeholder="Required for live mode"
                  data-testid="input-fixture-id"
                  disabled={demoMode}
                  className="mt-2 w-full bg-white/60 border border-navy/10 rounded-xl px-4 py-3 text-navy font-bold outline-none focus:ring-2 ring-forest/30 disabled:opacity-40"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                data-testid="toggle-demo-mode"
                className="w-4 h-4 accent-forest"
              />
              <span className="text-sm font-bold text-navy">Demo mode</span>
              <span className="text-[10px] text-navy/40">
                skip validate_stat and resolve with manual scores (use in local
                dev / when TXLINE_API_TOKEN is not activated)
              </span>
            </label>

            {demoMode && (
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <label className="text-[10px] font-black text-navy/50 uppercase tracking-widest">
                    Score A
                  </label>
                  <input
                    type="number"
                    value={demoScoreA}
                    onChange={(e) => setDemoScoreA(e.target.value)}
                    data-testid="input-demo-score-a"
                    className="mt-2 w-full bg-white/60 border border-navy/10 rounded-xl px-4 py-3 text-navy font-bold outline-none focus:ring-2 ring-forest/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-navy/50 uppercase tracking-widest">
                    Score B
                  </label>
                  <input
                    type="number"
                    value={demoScoreB}
                    onChange={(e) => setDemoScoreB(e.target.value)}
                    data-testid="input-demo-score-b"
                    className="mt-2 w-full bg-white/60 border border-navy/10 rounded-xl px-4 py-3 text-navy font-bold outline-none focus:ring-2 ring-forest/30"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleResolve}
              disabled={running || !matchId || (!demoMode && !fixtureId)}
              data-testid="btn-resolve-match"
              className="w-full py-4 bg-forest text-cream font-bold rounded-2xl transition-all hover:bg-forest/90 hover:shadow-xl hover:shadow-forest/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {running ? "Running resolution flow…" : "Run Resolution"}
            </button>
          </div>
        )}

        {steps.length > 0 && (
          <div className="glass rounded-3xl p-8 space-y-5" data-testid="resolution-flow">
            <h2 className="text-lg font-black text-navy tracking-tight">
              Settlement pipeline
            </h2>
            <ol className="space-y-4">
              {steps.map((step, idx) => (
                <li
                  key={step.key}
                  className="flex items-start gap-4"
                  data-testid={`step-${step.key}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      step.status === "success"
                        ? "bg-forest text-white"
                        : step.status === "running"
                        ? "bg-golden text-white animate-pulse"
                        : step.status === "error"
                        ? "bg-red-500 text-white"
                        : "bg-navy/10 text-navy/40"
                    }`}
                  >
                    {step.status === "success"
                      ? "✓"
                      : step.status === "error"
                      ? "!"
                      : idx + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-bold text-navy">{step.label}</p>
                    {step.detail && (
                      <p className="text-xs text-navy/60 mt-1 font-mono break-all">
                        {step.detail}
                      </p>
                    )}
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-forest font-bold hover:underline mt-1 inline-block"
                      >
                        View on Solana Explorer ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {finalResult && (
          <div
            className="glass rounded-3xl p-8 border-2 border-forest/30"
            data-testid="final-result"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-forest rounded-full flex items-center justify-center text-white font-black">
                ✓
              </div>
              <h2 className="text-xl font-black text-navy">
                Match settled on-chain
              </h2>
            </div>
            {finalResult.validate && (
              <p className="text-sm text-navy/70 mb-2">
                Verified outcome:{" "}
                <span className="font-black text-forest">
                  {finalResult.validate.verifiedOutcome} ({finalResult.validate.scoreA}-
                  {finalResult.validate.scoreB})
                </span>
              </p>
            )}
            <p className="text-xs text-navy/50 font-mono break-all">
              Resolve tx: {finalResult.resolveTxSig}
            </p>
            {finalResult.demoMode && (
              <p className="mt-4 text-[10px] text-golden bg-golden/10 border border-golden/30 rounded-lg px-3 py-2">
                Demo mode — validate_stat was skipped. Enable live mode +
                TXLINE_API_TOKEN to submit the full Merkle-verified pipeline.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
