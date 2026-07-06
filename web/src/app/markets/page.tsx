"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import WalletButton from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";

interface MatchData {
  id: number;
  fixtureId: number;
  teamA: string;
  teamB: string;
  flagA: string;
  flagB: string;
  kickoff: string;
  pool: number;
  odds: { home: number; draw: number; away: number };
  source: "txline" | "mock";
  competition: string;
}

const FLAG_MAP: Record<string, string> = {
  "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Germany": "🇩🇪", "France": "🇫🇷",
  "Spain": "🇪🇸", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Portugal": "🇵🇹", "Netherlands": "🇳🇱",
  "Italy": "🇮🇹", "Belgium": "🇧🇪", "Croatia": "🇭🇷", "Uruguay": "🇺🇾",
  "Colombia": "🇨🇴", "Mexico": "🇲🇽", "USA": "🇺🇸", "Japan": "🇯🇵",
  "South Korea": "🇰🇷", "Australia": "🇦🇺", "Morocco": "🇲🇦", "Senegal": "🇸🇳",
  "Ghana": "🇬🇭", "Cameroon": "🇨🇲", "Nigeria": "🇳🇬", "Saudi Arabia": "🇸🇦",
  "Qatar": "🇶🇦", "Iran": "🇮🇷", "Canada": "🇨🇦", "Ecuador": "🇪🇨",
  "Chile": "🇨🇱", "Denmark": "🇩🇰", "Sweden": "🇸🇪", "Norway": "🇳🇴",
  "Switzerland": "🇨🇭", "Poland": "🇵🇱", "Serbia": "🇷🇸", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Turkey": "🇹🇷", "Egypt": "🇪🇬", "Tunisia": "🇹🇳",
};

function getFlag(team: string): string {
  return FLAG_MAP[team] || "🏳️";
}

const MOCK_MATCHES: MatchData[] = [
  {
    id: 1,
    fixtureId: 0,
    teamA: "Brazil",
    teamB: "Argentina",
    flagA: "🇧🇷",
    flagB: "🇦🇷",
    kickoff: "2026-07-15 20:00 UTC",
    pool: 45200,
    odds: { home: 2.1, draw: 3.4, away: 2.8 },
    source: "mock",
    competition: "World Cup",
  },
  {
    id: 2,
    fixtureId: 0,
    teamA: "Germany",
    teamB: "France",
    flagA: "🇩🇪",
    flagB: "🇫🇷",
    kickoff: "2026-07-16 18:00 UTC",
    pool: 32100,
    odds: { home: 2.5, draw: 3.2, away: 2.4 },
    source: "mock",
    competition: "World Cup",
  },
  {
    id: 3,
    fixtureId: 0,
    teamA: "Spain",
    teamB: "England",
    flagA: "🇪🇸",
    flagB: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    kickoff: "2026-07-17 21:00 UTC",
    pool: 28700,
    odds: { home: 2.2, draw: 3.1, away: 2.9 },
    source: "mock",
    competition: "World Cup",
  },
  {
    id: 4,
    fixtureId: 0,
    teamA: "Portugal",
    teamB: "Netherlands",
    flagA: "🇵🇹",
    flagB: "🇳🇱",
    kickoff: "2026-07-18 19:00 UTC",
    pool: 19500,
    odds: { home: 2.3, draw: 3.3, away: 2.7 },
    source: "mock",
    competition: "World Cup",
  },
];

type PredictionType = "winner" | "overunder" | "score";

interface PredictionRecord {
  match: string;
  predLabel: string;
  amount: number;
  txSig: string;
}

export default function MarketsPage() {
  const wallet = useWallet();
  const { connected } = wallet;
  const { connection } = useConnection();
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
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txSignature, setTxSignature] = useState<string>("");
  const [myPredictions, setMyPredictions] = useState<PredictionRecord[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [askCoachOpen, setAskCoachOpen] = useState(false);
  const [askCoachQuestion, setAskCoachQuestion] = useState("");
  const [askCoachAnswer, setAskCoachAnswer] = useState("");
  const [askCoachLoading, setAskCoachLoading] = useState(false);

  // Fetch user's on-chain predictions
  useEffect(() => {
    if (!connected || !wallet.publicKey) {
      setMyPredictions([]);
      return;
    }
    async function fetchMyPredictions() {
      setLoadingPredictions(true);
      try {
        const { PublicKey } = await import("@solana/web3.js");
        const { Program, AnchorProvider } = await import("@coral-xyz/anchor");
        const { IDL } = await import("@/lib/idl");

        const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
        const provider = new AnchorProvider(connection, wallet as any, {});
        const program = new Program(IDL as any, provider);

        // Fetch all Prediction accounts owned by this user using getProgramAccounts
        const predictionDiscriminator = Buffer.from([98, 127, 141, 187, 218, 33, 8, 14]);
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { memcmp: { offset: 0, bytes: Buffer.from(predictionDiscriminator).toString("base64"), encoding: "base64" } },
            { memcmp: { offset: 8, bytes: wallet.publicKey!.toBase58() } },
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
            predictions.push({
              match: decoded.matchMarket?.toBase58?.() || decoded.match_market?.toBase58?.() || "Unknown",
              predLabel,
              amount: amountUsdc,
              txSig: "",
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
  }, [connected, wallet.publicKey, connection]);

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
          fixtures.slice(0, 12).map(async (f: any, i: number) => {
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
              flagA: getFlag(f.Participant1),
              flagB: getFlag(f.Participant2),
              kickoff: new Date(f.StartTime > 1e12 ? f.StartTime : f.StartTime * 1000).toUTCString(),
              pool: Math.floor(Math.random() * 50000) + 5000,
              odds,
              source: "txline" as const,
              competition: f.Competition || "Other",
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

  // Fetch AI Coach advice when match is selected
  useEffect(() => {
    if (!selectedMatch) {
      setAiAdvice(null);
      return;
    }
    const match = matches.find((m) => m.id === selectedMatch);
    if (!match) return;

    setAiLoading(true);
    setAiAdvice(null);
    fetch("/api/ai-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match: {
          teamA: match.teamA,
          teamB: match.teamB,
          odds: match.odds,
          kickoff: match.kickoff,
          competition: match.competition,
        },
      }),
    })
      .then((r) => r.json())
      .then((data) => setAiAdvice(data))
      .catch(() => setAiAdvice(null))
      .finally(() => setAiLoading(false));
  }, [selectedMatch, matches]);

  const handlePredict = useCallback(async () => {
    if (!connected || !selectedMatch || !amount) return;

    const match = matches.find((m) => m.id === selectedMatch);
    if (!match) return;

    let predictionTypeArg: any;
    if (predType === "winner") {
      const outcome =
        selectedOutcome === "home"
          ? { teamAWin: {} }
          : selectedOutcome === "away"
          ? { teamBWin: {} }
          : { draw: {} };
      predictionTypeArg = { matchWinner: { outcome } };
    } else if (predType === "overunder") {
      predictionTypeArg = {
        overUnder: {
          total_goals: Math.floor(parseFloat(overUnderValue) * 2),
          over: overUnderSide === "over",
        },
      };
    } else {
      predictionTypeArg = {
        correctScore: {
          score_a: parseInt(scoreA),
          score_b: parseInt(scoreB),
        },
      };
    }

    setTxStatus("pending");
    try {
      const { placeBetOnChain } = await import("@/lib/placeBet");
      const onChainMatchId = match.fixtureId || match.id;
      const kickoffEpoch = Math.floor(new Date(match.kickoff).getTime() / 1000);
      const tx = await placeBetOnChain(
        connection,
        wallet,
        onChainMatchId,
        predictionTypeArg,
        parseFloat(amount),
        match.teamA,
        match.teamB,
        kickoffEpoch
      );
      setTxSignature(tx);
      setTxStatus("success");
      // Save prediction to history immediately
      const selMatch = matches.find((m) => m.id === selectedMatch);
      let predLabel = "";
      if (predType === "winner") {
        predLabel = selectedOutcome === "home" ? `${selMatch?.teamA} Win` : selectedOutcome === "away" ? `${selMatch?.teamB} Win` : "Draw";
      } else if (predType === "overunder") {
        predLabel = `${overUnderSide === "over" ? "Over" : "Under"} ${overUnderValue}`;
      } else {
        predLabel = `Score: ${scoreA}-${scoreB}`;
      }
      const newPred: PredictionRecord = {
        match: `${selMatch?.teamA} vs ${selMatch?.teamB}`,
        predLabel,
        amount: parseFloat(amount),
        txSig: tx,
      };
      setMyPredictions((prev) => {
        const exists = prev.some((p) => p.txSig === tx);
        return exists ? prev : [newPred, ...prev];
      });
    } catch (err: any) {
      console.error("Transaction failed:", err);
      setTxStatus("error");
      const msg = err?.message || "Transaction failed";
      const logs = err?.logs?.join(" ") || msg;
      if (logs.includes("already in use")) {
        alert("You already placed a prediction on this match. Only 1 prediction per match is allowed.");
      } else if (logs.includes("AccountNotInitialized") && logs.includes("user_token_account")) {
        alert("You need devnet USDC in your wallet first. Get some from a devnet faucet.");
      } else if (logs.includes("AccountNotInitialized")) {
        alert("Account not initialized. The match market or vault needs setup.");
      } else if (msg.includes("insufficient") || logs.includes("0x1")) {
        alert("Insufficient USDC balance. You need devnet USDC to place predictions.");
      } else if (msg.includes("User rejected")) {
        alert("Transaction cancelled.");
      } else {
        alert(`Transaction failed: ${msg}`);
      }
    }
  }, [connected, selectedMatch, amount, matches, predType, selectedOutcome, overUnderValue, overUnderSide, scoreA, scoreB, connection, wallet]);

  return (
    <div className="min-h-screen bg-cream relative">
      {/* Background image */}
      <div className="fixed inset-0 z-0">
        <img
          src="/markets-bg.png"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/30" />
      </div>
      {/* Header */}
      <header className="glass fixed top-0 left-0 right-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Orakick"
              width={400}
              height={130}
              className="h-32 w-auto"
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

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-16 relative z-10">
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
              {(() => {
                const groups: Record<string, MatchData[]> = {};
                matches.forEach((m) => {
                  const comp = m.competition || "Other";
                  if (!groups[comp]) groups[comp] = [];
                  groups[comp].push(m);
                });
                const sortedKeys = Object.keys(groups).sort((a, b) =>
                  a === "World Cup" ? -1 : b === "World Cup" ? 1 : a.localeCompare(b)
                );
                return sortedKeys.map((comp) => (
                  <div key={comp} className="space-y-3">
                    <h3 className="text-sm font-bold text-navy/70 uppercase tracking-wider flex items-center gap-2">
                      <span>{comp === "World Cup" ? "🏆" : "⚽"}</span>
                      {comp}
                      <span className="text-[10px] font-normal text-navy/40">({groups[comp].length})</span>
                    </h3>
                    {groups[comp].map((match) => {
                      const matchStarted = new Date(match.kickoff).getTime() < Date.now();
                      return (
                <div
                  key={match.id}
                  onClick={() => setSelectedMatch(match.id)}
                  className={`bg-white/15 backdrop-blur-md border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl hover:bg-white/25 ${
                    selectedMatch === match.id
                      ? "ring-2 ring-forest shadow-xl bg-white/25"
                      : ""
                  } ${matchStarted ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-mono text-navy/40 flex items-center gap-2">
                      {match.kickoff}
                      {matchStarted && (
                        <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-bold">
                          STARTED
                        </span>
                      )}
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
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{match.flagA}</span>
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

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">{match.teamB}</span>
                      <span className="text-2xl">{match.flagB}</span>
                    </div>
                  </div>
                </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>

            {/* Bet slip + History */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white/15 backdrop-blur-md border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] rounded-2xl p-6 sticky top-28">
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

                    {/* AI Coach */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-forest/10 border border-purple-500/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🤖</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">AI Coach</span>
                        {aiLoading && <span className="text-[10px] text-navy/40 animate-pulse">analyzing...</span>}
                        {aiAdvice?.source && !aiLoading && (
                          <span className="text-[9px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                            {aiAdvice.source === "gemini" ? "Gemini AI" : "TxLINE Odds"}
                          </span>
                        )}
                      </div>
                      {aiAdvice && !aiLoading && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-navy">
                              {aiAdvice.recommendation === "home"
                                ? matches.find((m) => m.id === selectedMatch)?.teamA
                                : aiAdvice.recommendation === "away"
                                ? matches.find((m) => m.id === selectedMatch)?.teamB
                                : "Draw"}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              aiAdvice.confidence >= 50 ? "bg-forest/20 text-forest" :
                              aiAdvice.confidence >= 35 ? "bg-yellow-500/20 text-yellow-700" :
                              "bg-red-500/20 text-red-600"
                            }`}>
                              {aiAdvice.confidence}% confidence
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              aiAdvice.riskLevel === "Low" ? "bg-forest/10 text-forest" :
                              aiAdvice.riskLevel === "Medium" ? "bg-yellow-500/10 text-yellow-700" :
                              "bg-red-500/10 text-red-600"
                            }`}>
                              {aiAdvice.riskLevel} risk
                            </span>
                          </div>
                          <p className="text-[11px] text-navy/70 leading-relaxed">{aiAdvice.reasoning}</p>
                          <p className="text-[10px] text-purple-700/80 italic">{aiAdvice.valueBet}</p>
                        </>
                      )}
                      {!aiAdvice && !aiLoading && (
                        <p className="text-[11px] text-navy/40">Select a match to get AI analysis</p>
                      )}
                      {/* Ask Coach */}
                      {aiAdvice && !aiLoading && (
                        <div className="pt-2 border-t border-purple-500/10">
                          {!askCoachOpen ? (
                            <button
                              onClick={() => setAskCoachOpen(true)}
                              className="text-[11px] text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                            >
                              💬 Ask Coach a question...
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={askCoachQuestion}
                                  onChange={(e) => setAskCoachQuestion(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && askCoachQuestion.trim()) {
                                      setAskCoachLoading(true);
                                      setAskCoachAnswer("");
                                      const selMatch = matches.find((m) => m.id === selectedMatch);
                                      fetch("/api/ai-coach/ask", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          question: askCoachQuestion,
                                          match: { teamA: selMatch?.teamA, teamB: selMatch?.teamB, odds: selMatch?.odds, kickoff: selMatch?.kickoff, competition: selMatch?.competition },
                                        }),
                                      })
                                        .then((r) => r.json())
                                        .then((d) => setAskCoachAnswer(d.answer || "No answer"))
                                        .catch(() => setAskCoachAnswer("Failed to get answer"))
                                        .finally(() => setAskCoachLoading(false));
                                    }
                                  }}
                                  placeholder="e.g. Is Over 2.5 worth it?"
                                  className="flex-1 text-[11px] bg-white/50 border border-purple-500/20 rounded-lg px-3 py-1.5 text-navy placeholder:text-navy/30"
                                />
                                <button
                                  onClick={() => {
                                    if (!askCoachQuestion.trim()) return;
                                    setAskCoachLoading(true);
                                    setAskCoachAnswer("");
                                    const selMatch = matches.find((m) => m.id === selectedMatch);
                                    fetch("/api/ai-coach/ask", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        question: askCoachQuestion,
                                        match: { teamA: selMatch?.teamA, teamB: selMatch?.teamB, odds: selMatch?.odds, kickoff: selMatch?.kickoff, competition: selMatch?.competition },
                                      }),
                                    })
                                      .then((r) => r.json())
                                      .then((d) => setAskCoachAnswer(d.answer || "No answer"))
                                      .catch(() => setAskCoachAnswer("Failed to get answer"))
                                      .finally(() => setAskCoachLoading(false));
                                  }}
                                  disabled={askCoachLoading}
                                  className="text-[10px] bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                >
                                  {askCoachLoading ? "..." : "Ask"}
                                </button>
                              </div>
                              {askCoachLoading && (
                                <p className="text-[10px] text-purple-600 animate-pulse">Thinking...</p>
                              )}
                              {askCoachAnswer && (
                                <div className="bg-white/40 rounded-lg p-2">
                                  <p className="text-[11px] text-navy/80 leading-relaxed">{askCoachAnswer}</p>
                                </div>
                              )}
                              <div className="flex gap-2 flex-wrap">
                                {["Is Over 2.5 safe?", "Best value bet?", "Safest pick?"].map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => setAskCoachQuestion(q)}
                                    className="text-[9px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded-full hover:bg-purple-500/20"
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

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

                    {/* Prediction Summary */}
                    {amount && parseFloat(amount) > 0 && (() => {
                      const selMatch = matches.find((m) => m.id === selectedMatch);
                      if (!selMatch) return null;
                      let predLabel = "";
                      if (predType === "winner") {
                        predLabel = selectedOutcome === "home" ? `${selMatch.teamA} Win` : selectedOutcome === "away" ? `${selMatch.teamB} Win` : "Draw";
                      } else if (predType === "overunder") {
                        predLabel = `${overUnderSide === "over" ? "Over" : "Under"} ${overUnderValue} goals`;
                      } else {
                        predLabel = `Correct Score: ${scoreA} - ${scoreB}`;
                      }
                      return (
                        <div className="bg-navy/5 rounded-xl p-4 space-y-2 border border-navy/10">
                          <p className="text-[10px] uppercase tracking-wider text-navy/40 font-bold">Your Prediction</p>
                          <div className="text-sm text-navy">
                            <span className="font-bold">{selMatch.teamA}</span> vs <span className="font-bold">{selMatch.teamB}</span>
                          </div>
                          <div className="text-sm font-bold text-forest">{predLabel}</div>
                          <div className="text-xs text-navy/60">Stake: <span className="font-bold text-navy">{amount} USDC</span></div>
                        </div>
                      );
                    })()}

                    {/* Submit */}
                    {connected ? (
                      <div className="space-y-2">
                        {(() => {
                          const selMatch = matches.find((m) => m.id === selectedMatch);
                          const started = selMatch ? new Date(selMatch.kickoff).getTime() < Date.now() : false;
                          return started ? (
                            <div className="w-full py-3 bg-red-500/20 text-red-600 font-medium rounded-full text-center text-sm">
                              Match already started
                            </div>
                          ) : (
                            <button
                              onClick={handlePredict}
                              disabled={!amount || parseFloat(amount) <= 0 || txStatus === "pending"}
                              className="w-full py-3 bg-forest text-cream font-medium rounded-full hover:bg-forest/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {txStatus === "pending" ? "Confirming..." : "Place Prediction (On-Chain)"}
                            </button>
                          );
                        })()}
                        {txStatus === "success" && (
                          <div className="bg-forest/10 rounded-lg p-2 text-center">
                            <p className="text-xs text-forest font-medium">Transaction confirmed!</p>
                            <a
                              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-forest/70 underline"
                            >
                              View on Solana Explorer
                            </a>
                          </div>
                        )}
                        {txStatus === "error" && (
                          <p className="text-xs text-red-500 text-center">
                            Transaction failed. Check console for details.
                          </p>
                        )}
                      </div>
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

              {/* My Predictions History */}
              {connected && (
                <div className="bg-white/15 backdrop-blur-md border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] rounded-2xl p-6">
                  <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
                    My Predictions
                    {myPredictions.length > 0 && (
                      <span className="text-[10px] bg-forest/10 text-forest px-2 py-0.5 rounded-full">{myPredictions.length}</span>
                    )}
                  </h3>
                  {loadingPredictions ? (
                    <p className="text-xs text-navy/40 text-center py-4">Loading predictions...</p>
                  ) : myPredictions.length === 0 ? (
                    <p className="text-xs text-navy/40 text-center py-4">No predictions yet. Pick a match and place your first bet!</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {myPredictions.map((pred, i) => (
                        <div key={i} className="bg-navy/5 rounded-lg p-3 space-y-1">
                          <div className="text-xs font-bold text-navy">{pred.match}</div>
                          <div className="text-xs text-forest font-medium">{pred.predLabel}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-navy/50">{pred.amount} USDC</span>
                            {pred.txSig && (
                              <a
                                href={`https://explorer.solana.com/tx/${pred.txSig}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-forest/70 underline"
                              >
                                View tx
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
