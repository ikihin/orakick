"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";
import { PublicKey } from "@solana/web3.js";
import { claimWinningsOnChain } from "@/lib/claimWinnings";

function predictionWon(pt: any, market: any): boolean {
  const scoreA = market.finalScoreA ?? market.final_score_a ?? 0;
  const scoreB = market.finalScoreB ?? market.final_score_b ?? 0;
  const result = market.result || {};
  if (pt.matchWinner) {
    const outcome = pt.matchWinner.outcome;
    if (outcome.teamAWin) return result.teamAWin !== undefined;
    if (outcome.teamBWin) return result.teamBWin !== undefined;
    return result.draw !== undefined;
  }
  if (pt.overUnder) {
    const total = Number(scoreA) + Number(scoreB);
    const goals = Number(pt.overUnder.totalGoals ?? pt.overUnder.total_goals ?? 0);
    return pt.overUnder.over ? total > goals : total < goals;
  }
  if (pt.correctScore) {
    return (
      Number(pt.correctScore.scoreA ?? pt.correctScore.score_a) === Number(scoreA) &&
      Number(pt.correctScore.scoreB ?? pt.correctScore.score_b) === Number(scoreB)
    );
  }
  return false;
}

interface PredictionRecord {
  match: string;
  matchId?: number;
  fixtureId?: number;
  predLabel: string;
  amount: number;
  txSig: string;
  status: "Win" | "Lose" | "Pending";
  payout?: number;
  claimed?: boolean;
}

export default function ProfilePage() {
  const { connected, publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [myPredictions, setMyPredictions] = useState<PredictionRecord[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [proofViewer, setProofViewer] = useState<PredictionRecord | null>(null);
  const [proofData, setProofData] = useState<unknown>(null);
  const [proofLoading, setProofLoading] = useState(false);

  async function handleClaim(pred: PredictionRecord) {
    if (!connected || pred.matchId === undefined) return;
    setClaimingId(pred.matchId);
    try {
      const sig = await claimWinningsOnChain(connection, wallet, pred.matchId);
      window.alert(
        `Payout claimed on-chain.\nTx: ${sig}\n\nOpen Solana Explorer to verify.`
      );
      setMyPredictions((prev) =>
        prev.map((p) => (p.txSig === pred.txSig ? { ...p, claimed: true } : p))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Claim failed:", err);
      window.alert(`Claim failed: ${msg}`);
    } finally {
      setClaimingId(null);
    }
  }

  useEffect(() => {
    if (!proofViewer) {
      setProofData(null);
      return;
    }
    if (!proofViewer.fixtureId) {
      setProofData({ note: "No fixtureId recorded — proof unavailable for this on-chain prediction." });
      return;
    }
    setProofLoading(true);
    fetch(`/txapi/proofs/scores?fixtureId=${proofViewer.fixtureId}&demo=1`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        setProofData(body);
      })
      .catch((err) => setProofData({ error: err instanceof Error ? err.message : String(err) }))
      .finally(() => setProofLoading(false));
  }, [proofViewer]);

  useEffect(() => { setMounted(true); }, []);

  const netProfit = useMemo(
    () =>
      myPredictions.reduce(
        (acc, p) => acc + (p.status === "Win" ? (p.payout || 0) - p.amount : 0),
        0
      ),
    [myPredictions]
  );

  const totalLoss = useMemo(
    () =>
      myPredictions.reduce(
        (acc, p) => acc + (p.status === "Lose" ? p.amount : 0),
        0
      ),
    [myPredictions]
  );

  useEffect(() => {
    async function fetchProfile() {
      if (connected && publicKey) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("username")
            .eq("wallet_address", publicKey.toBase58())
            .single();
          
          if (data?.username) {
            setUsername(data.username);
          } else {
            const saved = localStorage.getItem(`orakick_user_${publicKey.toBase58()}`);
            if (saved) setUsername(saved);
          }
        } catch {
          const saved = localStorage.getItem(`orakick_user_${publicKey.toBase58()}`);
          if (saved) setUsername(saved);
        }
      } else {
        setUsername(null);
      }
    }
    fetchProfile();
  }, [connected, publicKey]);

  useEffect(() => {
    if (!mounted || !connected || !publicKey) return;

    async function fetchMyPredictions() {
      setLoadingPredictions(true);
      try {
        const { PublicKey } = await import("@solana/web3.js");
        const { Program, AnchorProvider } = await import("@coral-xyz/anchor");
        const { IDL } = await import("@/lib/idl");

        const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
        const provider = new AnchorProvider(connection, wallet as any, {});
        const program = new Program(IDL as any, provider);

        const predictionDiscriminator = Buffer.from([98, 127, 141, 187, 218, 33, 8, 14]);
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { memcmp: { offset: 0, bytes: Buffer.from(predictionDiscriminator).toString("base64"), encoding: "base64" } },
            { memcmp: { offset: 8, bytes: publicKey!.toBase58() } },
          ],
        });

        // Batch-fetch every match_market referenced by these predictions so
        // we can derive real win/lose/pending statuses from on-chain results
        // instead of faking them.
        const marketAddresses = accounts
          .map(({ account }) => {
            try {
              const decoded = (program.coder.accounts as any).decode(
                "Prediction",
                account.data
              );
              return (decoded.matchMarket || decoded.match_market) as {
                toBase58: () => string;
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean) as { toBase58: () => string }[];

        const uniqueMarketPubkeys = Array.from(
          new Map(marketAddresses.map((k) => [k.toBase58(), k])).values()
        );

        const marketInfos = await connection.getMultipleAccountsInfo(
          uniqueMarketPubkeys.map((k) => new PublicKey(k.toBase58()))
        );
        const marketByKey = new Map<string, any>();
        uniqueMarketPubkeys.forEach((k, i) => {
          const info = marketInfos[i];
          if (!info) return;
          try {
            const decoded = (program.coder.accounts as any).decode(
              "MatchMarket",
              info.data
            );
            marketByKey.set(k.toBase58(), decoded);
          } catch (err) {
            console.warn("Failed to decode MatchMarket", k.toBase58(), err);
          }
        });

        const predictions: PredictionRecord[] = [];
        for (const { pubkey, account } of accounts) {
          try {
            const decoded = (program.coder.accounts as any).decode("Prediction", account.data);
            let predLabel = "";
            const pt = decoded.predictionType || decoded.prediction_type;
            if (pt.matchWinner) {
              const outcome = pt.matchWinner.outcome;
              predLabel = outcome.teamAWin ? "Team A Win" : outcome.teamBWin ? "Team B Win" : "Draw";
            } else if (pt.overUnder) {
              predLabel = `${pt.overUnder.over ? "Over" : "Under"} ${pt.overUnder.totalGoals || pt.overUnder.total_goals}`;
            } else if (pt.correctScore) {
              predLabel = `Score: ${pt.correctScore.scoreA || pt.correctScore.score_a}-${pt.correctScore.scoreB || pt.correctScore.score_b}`;
            }
            const amountUsdc = (decoded.amount?.toNumber?.() || decoded.amount) / 1_000_000;

            const marketAddr = (decoded.matchMarket || decoded.match_market)?.toBase58?.();
            const market = marketAddr ? marketByKey.get(marketAddr) : null;
            let status: "Win" | "Lose" | "Pending" = "Pending";
            let payout = 0;
            let matchName = "Match " + pubkey.toBase58().slice(0, 4);
            let matchIdNum: number | undefined;
            if (market) {
              matchName = `${market.teamA} vs ${market.teamB}`;
              matchIdNum = market.matchId?.toNumber?.() ?? Number(market.matchId);
              const resolved = market.status?.resolved !== undefined;
              if (resolved && market.result) {
                const won = predictionWon(pt, market);
                status = won ? "Win" : "Lose";
                payout = won ? amountUsdc * 2 : 0;
              }
            }
            const claimed = Boolean(decoded.claimed);

            predictions.push({
              match: matchName,
              matchId: matchIdNum,
              fixtureId: matchIdNum,
              predLabel,
              amount: amountUsdc,
              txSig: pubkey.toBase58(),
              status,
              payout,
              claimed,
            });
          } catch (err) {
            console.error("Failed to decode Prediction account", pubkey.toBase58(), err);
          }
        }
        setMyPredictions(predictions);
      } catch (err) {
        console.error("Failed to fetch predictions:", err);
      } finally {
        setLoadingPredictions(false);
      }
    }
    fetchMyPredictions();
  }, [mounted, connected, publicKey, connection, wallet]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image 
          src="/profile-bg.png" 
          alt="Profile Background" 
          fill 
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-cream/40 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-1 max-w-7xl mx-auto px-6 pt-32 pb-20 w-full">
        {!connected ? (
          <div className="h-96 backdrop-blur-xl bg-white/20 rounded-3xl flex flex-col items-center justify-center border border-white/40 text-center space-y-6 shadow-2xl">
            <div className="text-6xl drop-shadow-lg">🔒</div>
            <h2 className="text-2xl font-black text-navy drop-shadow-sm">Please Connect Your Wallet</h2>
            <p className="text-navy/70 font-medium max-w-xs drop-shadow-sm">You need to connect your Solana wallet to view your profile and predictions.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Header Profile */}
            <div className="backdrop-blur-2xl bg-white/30 rounded-[40px] p-10 border border-white/50 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-forest/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-forest/20 transition-all duration-700" />
               
               <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
                 <div className="flex flex-col md:flex-row items-center gap-8">
                   <div className="w-24 h-24 bg-gradient-to-br from-forest to-forest/60 rounded-[32px] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-forest/30 rotate-3 transform transition-transform group-hover:rotate-6">
                     {username ? username[0].toUpperCase() : "?"}
                   </div>
                   <div className="text-center md:text-left space-y-2">
                     <h1 className="text-4xl font-black text-navy drop-shadow-md" style={{ fontFamily: "var(--font-playfair)" }}>
                       {username || "Anonymous Hero"}
                     </h1>
                     <div className="flex items-center gap-2 bg-navy/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                       <span className="w-2 h-2 rounded-full bg-forest animate-pulse shadow-[0_0_8px_rgba(27,67,50,0.5)]" />
                       <p className="text-[10px] font-bold font-mono text-navy/70">{publicKey?.toBase58()}</p>
                     </div>
                   </div>
                 </div>

                 <div className="grid grid-cols-3 gap-12 bg-white/40 backdrop-blur-3xl p-8 rounded-[32px] border border-white/60 shadow-inner">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Predictions</p>
                      <p className="text-3xl font-black text-navy drop-shadow-sm">{myPredictions.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Net Profit</p>
                      <p className="text-3xl font-black text-forest drop-shadow-sm">
                        +${netProfit.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Total Loss</p>
                      <p className="text-3xl font-black text-red-600 drop-shadow-sm">
                        -${totalLoss.toFixed(1)}
                      </p>
                    </div>
                 </div>
               </div>
            </div>

            {/* History Tabs */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-navy drop-shadow-sm">Prediction History</h3>
                <div className="flex gap-2">
                  {["All", "Won", "Lost", "Pending"].map(t => (
                    <button key={t} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${t === "All" ? "bg-navy text-white border-navy" : "bg-white/40 backdrop-blur-md text-navy/60 border-white/40 hover:bg-white/60 hover:text-navy shadow-sm"}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myPredictions.map((pred) => (
                  <div key={pred.txSig} className="backdrop-blur-xl bg-white/30 rounded-3xl p-6 border border-white/40 hover:scale-[1.03] hover:bg-white/40 transition-all group shadow-xl hover:shadow-2xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-navy/40 uppercase tracking-wider">{pred.match}</p>
                        <h4 className="text-sm font-black text-navy">{pred.predLabel}</h4>
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase shadow-sm ${
                        pred.status === "Win" ? "bg-forest text-white" :
                        pred.status === "Lose" ? "bg-red-500 text-white" :
                        "bg-navy/20 text-navy/70 backdrop-blur-md"
                      }`}>
                        {pred.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-navy/40 uppercase">Stake</p>
                        <p className="text-sm font-black text-navy">{pred.amount} USDC</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-bold text-navy/40 uppercase">Result</p>
                        <p className={`text-sm font-black drop-shadow-sm ${pred.status === "Win" ? "text-forest" : pred.status === "Lose" ? "text-red-600" : "text-navy/40"}`}>
                          {pred.status === "Win" ? `+$${pred.payout?.toFixed(1)}` : pred.status === "Lose" ? `-$${pred.amount.toFixed(1)}` : "TBD"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center gap-2">
                      <a 
                        href={`https://explorer.solana.com/tx/${pred.txSig}?cluster=devnet`} 
                        target="_blank" 
                        className="text-[10px] font-black text-forest hover:text-forest/80 flex items-center gap-1 tracking-tighter"
                        data-testid={`explorer-${pred.txSig}`}
                      >
                        VIEW ON EXPLORER ↗
                      </a>
                      <div className="flex gap-2">
                        <button 
                          className="px-3 py-1.5 bg-navy/10 hover:bg-navy/20 rounded-lg text-[9px] font-black text-navy transition-all border border-navy/5"
                          onClick={() => setProofViewer(pred)}
                          data-testid={`btn-proof-${pred.txSig}`}
                        >
                          PROOF
                        </button>
                        {pred.status === "Win" && !pred.claimed && pred.matchId !== undefined && (
                          <button
                            disabled={claimingId === pred.matchId}
                            onClick={() => handleClaim(pred)}
                            data-testid={`btn-claim-${pred.txSig}`}
                            className="px-3 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-lg text-[9px] font-black transition-all disabled:opacity-50"
                          >
                            {claimingId === pred.matchId ? "CLAIMING…" : "CLAIM USDC"}
                          </button>
                        )}
                        {pred.claimed && (
                          <span className="px-3 py-1.5 bg-forest/20 text-forest rounded-lg text-[9px] font-black">
                            CLAIMED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {myPredictions.length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="text-4xl">⚽</div>
                    <p className="text-navy/30 text-sm font-medium">No predictions found yet. Time to take your first shot!</p>
                    <a href="/markets" className="inline-block px-6 py-3 bg-forest text-white text-xs font-bold rounded-full">Go to Markets</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      </div>

      {proofViewer && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-6"
          data-testid="proof-viewer-modal"
        >
          <div
            className="absolute inset-0 bg-navy/70 backdrop-blur-sm"
            onClick={() => setProofViewer(null)}
          />
          <div className="relative bg-cream rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto shadow-2xl border border-white/40">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-navy">TxLINE Merkle Proof</h3>
                <p className="text-xs text-navy/50">{proofViewer.match}</p>
              </div>
              <button
                onClick={() => setProofViewer(null)}
                className="text-navy/40 hover:text-navy font-black text-xl"
                data-testid="btn-close-proof-viewer"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-xs text-navy/70">
                Anchored on TxOracle daily-scores root. Judges and users can
                replay <code className="text-forest bg-forest/10 px-1 rounded">validate_stat</code>{" "}
                with this payload against program{" "}
                <span className="font-mono text-[10px]">
                  6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
                </span>.
              </div>
              {proofLoading ? (
                <div className="py-8 text-center text-navy/40 text-sm">
                  Fetching proof from TxLINE…
                </div>
              ) : (
                <pre className="text-[10px] text-navy/70 bg-navy/5 rounded-2xl p-4 overflow-auto max-h-[45vh] font-mono">
                  {JSON.stringify(proofData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
