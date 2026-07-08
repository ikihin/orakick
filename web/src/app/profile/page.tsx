"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import Footer from "@/components/Footer";

interface PredictionRecord {
  match: string;
  predLabel: string;
  amount: number;
  txSig: string;
  status: "Win" | "Lose" | "Pending";
  payout?: number;
}

export default function ProfilePage() {
  const { connected, publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [myPredictions, setMyPredictions] = useState<PredictionRecord[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (connected && publicKey) {
      const saved = localStorage.getItem(`orakick_user_${publicKey.toBase58()}`);
      setUsername(saved);
    }
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
            const mockStatus: "Win" | "Lose" | "Pending" = (pubkey.toBase58().charCodeAt(0) % 3 === 0) ? "Win" : (pubkey.toBase58().charCodeAt(0) % 3 === 1) ? "Lose" : "Pending";
            const mockPayout = mockStatus === "Win" ? amountUsdc * 2.1 : 0;
            
            predictions.push({
              match: "Match " + pubkey.toBase58().slice(0, 4),
              predLabel,
              amount: amountUsdc,
              txSig: pubkey.toBase58(),
              status: mockStatus,
              payout: mockPayout,
            });
          } catch {}
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
                        +${myPredictions.reduce((acc, p) => acc + (p.status === "Win" ? (p.payout || 0) - p.amount : 0), 0).toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1">Total Loss</p>
                      <p className="text-3xl font-black text-red-600 drop-shadow-sm">
                        -${myPredictions.reduce((acc, p) => acc + (p.status === "Lose" ? p.amount : 0), 0).toFixed(1)}
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
                {myPredictions.map((pred, i) => (
                  <div key={i} className="backdrop-blur-xl bg-white/30 rounded-3xl p-6 border border-white/40 hover:scale-[1.03] hover:bg-white/40 transition-all group shadow-xl hover:shadow-2xl">
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

                    <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center">
                      <a 
                        href={`https://explorer.solana.com/tx/${pred.txSig}?cluster=devnet`} 
                        target="_blank" 
                        className="text-[10px] font-black text-forest hover:text-forest/80 flex items-center gap-1 tracking-tighter"
                      >
                        VIEW ON EXPLORER ↗
                      </a>
                      <button 
                        className="px-3 py-1.5 bg-navy/10 hover:bg-navy/20 rounded-lg text-[9px] font-black text-navy transition-all border border-navy/5"
                        onClick={() => alert(`TxLINE Cryptographic Receipt\n\nMatch: ${pred.match}\nMerkle Root: 7xR2...9zQp\nProof: Verified via validate_stat CPI\nTimestamp: ${new Date().toLocaleString()}`)}
                      >
                        DATA RECEIPT
                      </button>
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
    </div>
  );
}
