"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import WalletButton from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";

interface MatchData {
  id: number;
  fixtureId: number;
  teamA: string;
  teamB: string;
  kickoff: string;
  pool: number;
  odds: { home: number; draw: number; away: number };
  source: "txline" | "mock";
}

const MOCK_MATCHES: MatchData[] = [
  {
    id: 1,
    fixtureId: 0,
    teamA: "Brazil",
    teamB: "Argentina",
    kickoff: "2026-07-15 20:00 UTC",
    pool: 45200,
    odds: { home: 2.1, draw: 3.4, away: 2.8 },
    source: "mock",
  },
  {
    id: 2,
    fixtureId: 0,
    teamA: "Germany",
    teamB: "France",
    kickoff: "2026-07-16 18:00 UTC",
    pool: 32100,
    odds: { home: 2.5, draw: 3.2, away: 2.4 },
    source: "mock",
  },
  {
    id: 3,
    fixtureId: 0,
    teamA: "Spain",
    teamB: "England",
    kickoff: "2026-07-17 21:00 UTC",
    pool: 28700,
    odds: { home: 2.2, draw: 3.1, away: 2.9 },
    source: "mock",
  },
  {
    id: 4,
    fixtureId: 0,
    teamA: "Portugal",
    teamB: "Netherlands",
    kickoff: "2026-07-18 19:00 UTC",
    pool: 19500,
    odds: { home: 2.3, draw: 3.3, away: 2.7 },
    source: "mock",
  },
];

type PredictionType = "winner" | "overunder" | "score";

export default function MarketsPage() {
  const { connected } = useWallet();
  const [matches, setMatches] = useState<MatchData[]>(MOCK_MATCHES);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"txline" | "mock">("mock");
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [predType, setPredType] = useState<PredictionType>("winner");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [overUnderValue, setOverUnderValue] = useState("2.5");
  const [overUnderSide, setOverUnderSide] = useState<"over" | "under">("over");
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");

  useEffect(() => {
    async function fetchTxLineData() {
      try {
        const res = await fetch("/api/fixtures");
        if (!res.ok) throw new Error("API error");
        const fixtures = await res.json();

        if (!Array.isArray(fixtures) || fixtures.length === 0) {
          setLoading(false);
          return;
        }

        const txlineMatches: MatchData[] = await Promise.all(
          fixtures.slice(0, 8).map(async (f: any, i: number) => {
            let odds = { home: 2.0, draw: 3.2, away: 2.5 };
            try {
              const oddsRes = await fetch(`/api/odds?fixtureId=${f.FixtureId}`);
              if (oddsRes.ok) {
                const oddsData = await oddsRes.json();
                const match1x2 = Array.isArray(oddsData)
                  ? oddsData.find(
                      (o: any) => o.SuperOddsType === "1X2" && !o.InRunning
                    )
                  : null;
                if (match1x2 && match1x2.Prices?.length >= 3) {
                  odds = {
                    home: match1x2.Prices[0] / 100,
                    draw: match1x2.Prices[1] / 100,
                    away: match1x2.Prices[2] / 100,
                  };
                }
              }
            } catch {}

            return {
              id: i + 1,
              fixtureId: f.FixtureId,
              teamA: f.Participant1,
              teamB: f.Participant2,
              kickoff: new Date(f.StartTime * 1000).toUTCString(),
              pool: Math.floor(Math.random() * 50000) + 5000,
              odds,
              source: "txline" as const,
            };
          })
        );

        if (txlineMatches.length > 0) {
          setMatches(txlineMatches);
          setDataSource("txline");
        }
      } catch {
        // Fallback to mock data
      } finally {
        setLoading(false);
      }
    }

    fetchTxLineData();
  }, []);

  const handlePredict = () => {
    if (!connected) return;
    const match = matches.find((m) => m.id === selectedMatch);
    alert(
      `Prediction placed!\nMatch: ${match?.teamA} vs ${match?.teamB}\nType: ${predType}\nAmount: ${amount} USDC\nSource: ${dataSource}\n\n(On-chain settlement after contract deploy)`
    );
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Orakick"
              width={180}
              height={60}
              className="h-12 w-auto"
            />
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-navy/70 hover:text-forest">
              Home
            </a>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h1
              className="text-4xl font-black text-navy mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Prediction Markets
            </h1>
            <p className="text-navy/50">
              Pick your match, choose your prediction type, and place your bet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                dataSource === "txline" ? "bg-accent animate-pulse" : "bg-navy/20"
              }`}
            />
            <span className="text-xs text-navy/40 font-mono">
              {dataSource === "txline" ? "Live TxLINE Data" : "Demo Data"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="text-4xl animate-spin-slow">⚽</div>
              <p className="text-navy/40 text-sm">
                Fetching matches from TxLINE...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Match list */}
            <div className="lg:col-span-2 space-y-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => setSelectedMatch(match.id)}
                  className={`glass rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    selectedMatch === match.id
                      ? "ring-2 ring-forest shadow-lg"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-mono text-navy/40">
                      {match.kickoff}
                    </div>
                    <div className="flex items-center gap-2">
                      {match.source === "txline" && (
                        <span className="text-[10px] bg-forest/10 text-forest px-2 py-0.5 rounded-full font-mono">
                          TxLINE
                        </span>
                      )}
                      <span className="text-xs font-mono text-forest">
                        Pool: ${match.pool.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-navy">{match.teamA}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMatch(match.id);
                          setPredType("winner");
                          setSelectedOutcome("home");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          selectedMatch === match.id &&
                          selectedOutcome === "home"
                            ? "bg-forest text-cream"
                            : "bg-navy/5 text-navy/60 hover:bg-forest/10"
                        }`}
                      >
                        {match.odds.home.toFixed(2)}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMatch(match.id);
                          setPredType("winner");
                          setSelectedOutcome("draw");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          selectedMatch === match.id &&
                          selectedOutcome === "draw"
                            ? "bg-forest text-cream"
                            : "bg-navy/5 text-navy/60 hover:bg-forest/10"
                        }`}
                      >
                        {match.odds.draw.toFixed(2)}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMatch(match.id);
                          setPredType("winner");
                          setSelectedOutcome("away");
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          selectedMatch === match.id &&
                          selectedOutcome === "away"
                            ? "bg-forest text-cream"
                            : "bg-navy/5 text-navy/60 hover:bg-forest/10"
                        }`}
                      >
                        {match.odds.away.toFixed(2)}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-navy">{match.teamB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bet slip */}
            <div className="lg:col-span-1">
              <div className="glass rounded-2xl p-6 sticky top-28">
                <h3 className="font-bold text-navy mb-4">Place Prediction</h3>

                {!selectedMatch ? (
                  <p className="text-sm text-navy/40">
                    Select a match to start predicting
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Prediction type tabs */}
                    <div className="flex gap-1 bg-navy/5 rounded-lg p-1">
                      {(
                        ["winner", "overunder", "score"] as PredictionType[]
                      ).map((type) => (
                        <button
                          key={type}
                          onClick={() => setPredType(type)}
                          className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${
                            predType === type
                              ? "bg-forest text-cream"
                              : "text-navy/50 hover:text-navy"
                          }`}
                        >
                          {type === "winner"
                            ? "Winner"
                            : type === "overunder"
                            ? "Over/Under"
                            : "Score"}
                        </button>
                      ))}
                    </div>

                    {/* Winner selection */}
                    {predType === "winner" && (
                      <div className="text-sm text-navy/60">
                        Selected:{" "}
                        <span className="font-bold text-navy">
                          {selectedOutcome === "home"
                            ? matches.find((m) => m.id === selectedMatch)?.teamA
                            : selectedOutcome === "away"
                            ? matches.find((m) => m.id === selectedMatch)?.teamB
                            : selectedOutcome === "draw"
                            ? "Draw"
                            : "Pick an outcome"}
                        </span>
                      </div>
                    )}

                    {/* Over/Under */}
                    {predType === "overunder" && (
                      <div className="space-y-2">
                        <label className="text-xs text-navy/50">
                          Total Goals
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={overUnderValue}
                            onChange={(e) => setOverUnderValue(e.target.value)}
                            className="flex-1 bg-navy/5 rounded-lg px-3 py-2 text-sm text-navy"
                          >
                            <option value="1.5">1.5</option>
                            <option value="2.5">2.5</option>
                            <option value="3.5">3.5</option>
                            <option value="4.5">4.5</option>
                          </select>
                          <button
                            onClick={() => setOverUnderSide("over")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold ${
                              overUnderSide === "over"
                                ? "bg-forest text-cream"
                                : "bg-navy/5 text-navy/50"
                            }`}
                          >
                            Over
                          </button>
                          <button
                            onClick={() => setOverUnderSide("under")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold ${
                              overUnderSide === "under"
                                ? "bg-forest text-cream"
                                : "bg-navy/5 text-navy/50"
                            }`}
                          >
                            Under
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Correct Score */}
                    {predType === "score" && (
                      <div className="space-y-2">
                        <label className="text-xs text-navy/50">
                          Predicted Score
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={scoreA}
                            onChange={(e) => setScoreA(e.target.value)}
                            className="w-16 bg-navy/5 rounded-lg px-3 py-2 text-center text-navy font-bold"
                          />
                          <span className="text-navy/40 font-bold">—</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={scoreB}
                            onChange={(e) => setScoreB(e.target.value)}
                            className="w-16 bg-navy/5 rounded-lg px-3 py-2 text-center text-navy font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-xs text-navy/50">
                        Amount (USDC)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-navy/5 rounded-lg px-4 py-3 text-navy font-medium placeholder:text-navy/30"
                      />
                    </div>

                    {/* Potential return */}
                    {amount && selectedMatch && (
                      <div className="bg-forest/5 rounded-lg p-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-navy/50">Potential Return</span>
                          <span className="font-bold text-forest">
                            {(
                              parseFloat(amount) *
                              (predType === "score"
                                ? 8.0
                                : predType === "overunder"
                                ? 1.9
                                : selectedOutcome === "home"
                                ? matches.find((m) => m.id === selectedMatch)
                                    ?.odds.home || 1
                                : selectedOutcome === "away"
                                ? matches.find((m) => m.id === selectedMatch)
                                    ?.odds.away || 1
                                : matches.find((m) => m.id === selectedMatch)
                                    ?.odds.draw || 1)
                            ).toFixed(2)}{" "}
                            USDC
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Submit */}
                    {connected ? (
                      <button
                        onClick={handlePredict}
                        disabled={!amount || parseFloat(amount) <= 0}
                        className="w-full py-3 bg-forest text-cream font-medium rounded-full hover:bg-forest/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Place Prediction
                      </button>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-navy/40 mb-2">
                          Connect wallet to predict
                        </p>
                        <WalletButton />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
