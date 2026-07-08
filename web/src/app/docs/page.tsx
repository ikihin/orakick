"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DocsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-32 pb-20 w-full space-y-12">
        <header className="space-y-4">
          <div className="inline-block px-3 py-1 bg-forest/10 text-forest text-[10px] font-black rounded-full tracking-[0.2em] uppercase">Technical Documentation</div>
          <h1 className="text-5xl font-black text-navy leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
            Orakick Technical <br />Architecture
          </h1>
          <p className="text-navy/50 text-lg leading-relaxed">
            How Orakick leverages TxLINE and Solana to build the most transparent prediction market for the 2026 World Cup.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">01</span>
            Data Layer: TxLINE Integration
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-6">
            <p className="text-navy/70 leading-relaxed">
              Orakick ingests real-time match data and consensus odds via TxLINE's high-performance API. This ensures all market prices are rooted in global betting consensus.
            </p>
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-navy uppercase tracking-widest">Endpoints Used:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: "Snapshot Fixtures", path: "/txapi/fixtures/snapshot", desc: "Retrieves the full tournament schedule." },
                  { name: "Snapshot Odds", path: "/txapi/odds/snapshot/{id}", desc: "Consensus 1X2 market prices." },
                  { name: "Live Odds Stream", path: "/txapi/odds/stream", desc: "Real-time SSE feed for price movement." },
                  { name: "Merkle Scores", path: "/txapi/scores/verifiable", desc: "Cryptographic proofs for result resolution." },
                ].map(item => (
                  <li key={item.name} className="bg-white/50 p-4 rounded-2xl border border-navy/5">
                    <p className="text-xs font-black text-forest">{item.name}</p>
                    <code className="text-[10px] text-navy/40 font-mono block mb-1">{item.path}</code>
                    <p className="text-[10px] text-navy/60">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">02</span>
            On-Chain Settlement (CPI)
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-6 text-navy/70 leading-relaxed">
            <p>
              Security is paramount. Orakick uses <strong>Cross-Program Invocations (CPI)</strong> to TxLINE's <code>validate_stat</code> instruction. This prevents any centralized manipulation of match results.
            </p>
            <div className="bg-navy rounded-2xl p-6 overflow-hidden">
              <pre className="text-[10px] text-cream/70 font-mono overflow-x-auto">
{`// Anchor CPI Implementation
invoke_signed(
    &txline_program::instructions::validate_stat(
        ctx.accounts.txline_program.key,
        match_id,
        stat_id,
        expected_result,
        merkle_proof
    ),
    &[
        ctx.accounts.oracle_pda.to_account_info(),
        ctx.accounts.match_data.to_account_info(),
    ],
    signer_seeds,
)?;`}
              </pre>
            </div>
            <p className="text-xs">The protocol only releases escrowed USDC to winners once a verifiable Merkle proof is confirmed by the TxLINE program on Solana.</p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-navy flex items-center gap-3">
            <span className="w-8 h-8 bg-forest text-white rounded-lg flex items-center justify-center text-sm">03</span>
            Analytic Engine: Implied Probability
          </h2>
          <div className="glass rounded-[32px] p-8 border border-white/40 space-y-4">
            <p className="text-navy/70 leading-relaxed">
              Orakick converts TxLINE odds into <strong>Implied Probability</strong> models. Our AI Coach (Sonnet-3.5) compares these probabilities against real-time match momentum to identify "Market Inefficiency" or "High Value" trades.
            </p>
            <div className="flex gap-4">
               <div className="flex-1 bg-forest/5 p-4 rounded-2xl text-center">
                 <p className="text-[10px] font-bold text-forest uppercase">Formula</p>
                 <p className="text-sm font-black text-navy">1 / Odds * 100</p>
               </div>
               <div className="flex-1 bg-navy/5 p-4 rounded-2xl text-center">
                 <p className="text-[10px] font-bold text-navy/40 uppercase">Resolution</p>
                 <p className="text-sm font-black text-navy">Automatic via Oracle</p>
               </div>
            </div>
          </div>
        </section>

        <div className="pt-10 border-t border-navy/5 text-center">
          <a href="/markets" className="inline-block px-10 py-5 bg-forest text-white font-black rounded-full shadow-2xl shadow-forest/20 hover:scale-105 transition-all">LAUNCH TRADING DASHBOARD</a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
