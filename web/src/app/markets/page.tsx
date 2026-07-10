"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import WalletButton from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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
  marketPubkey?: string;
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
  matchId?: number;
  predLabel: string;
  amount: number;
  txSig: string;
  status: "Win" | "Lose" | "Pending";
  payout?: number;
  matchMarketPubkey?: string;
}

// Live Probability Chart Component
function MatchChart({ match, points }: { match: MatchData, points: number }) {
  const data = useMemo(() => {
    // Generate mock history points leading up to current odds
    return Array.from({ length: points }).map((_, i) => ({
      time: i,
      home: Math.max(20, Math.min(80, (100 / match.odds.home) - (5 - (i % 10)))),
      away: Math.max(20, Math.min(80, (100 / match.odds.away) - ((i % 10) - 5))),
      draw: Math.max(10, Math.min(40, (100 / match.odds.draw) + (Math.sin(i) * 2))),
    }));
  }, [match, points]);

  return (
    <div className="h-64 w-full bg-white/5 rounded-2xl p-4 border border-navy/5">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} stroke="rgba(0,0,0,0.3)" fontSize={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="home" 
            name={match.teamA} 
            stroke="#1B4332" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="draw" 
            name="Draw" 
            stroke="#D4A373" 
            strokeWidth={2} 
            dot={false} 
          />
          <Line 
            type="monotone" 
            dataKey="away" 
            name={match.teamB} 
            stroke="#E63946" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MarketsPage() {
  const wallet = useWallet();
  const { connected, publicKey, disconnect } = wallet;
  const { connection } = useConnection();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // User Profile States
  const [username, setUsername] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [matches, setMatches] = useState<MatchData[]>(MOCK_MATCHES);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"txline" | "mock">("mock");
  const [selectedMatch, setSelectedMatch] = useState<number | null>(1);
  const [chatMessages, setChatMessages] = useState<
    { id: string; user: string; text: string; color: string }[]
  >([
    { id: "seed-1", user: "SolanaWhale", text: "Brazil looking strong tonight!", color: "text-forest" },
    { id: "seed-2", user: "CryptoKing", text: "Odds for Draw are insane right now.", color: "text-sky-600" },
    { id: "seed-3", user: "Orakick_Bot", text: "AI Coach just updated prediction for this match.", color: "text-purple-600 font-bold" },
    { id: "seed-4", user: "Degen_101", text: "LFG! Just went long on Over 2.5", color: "text-golden" },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Simulated Live Data
  const [liveDataPoints, setLiveDataPoints] = useState<number>(10);
  const [poolAddon, setPoolAddon] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveDataPoints(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Trigger username modal handled by Navbar, but we keep local state for profile view
  useEffect(() => {
    if (connected && publicKey) {
      const saved = localStorage.getItem(`orakick_user_${publicKey.toBase58()}`);
      if (saved) {
        setUsername(saved);
      }
    } else {
      setUsername(null);
    }
  }, [connected, publicKey]);

  const [predType, setPredType] = useState<PredictionType>("winner");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [overUnderValue, setOverUnderValue] = useState("2.5");
  const [overUnderSide, setOverUnderSide] = useState<"over" | "under">("over");
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [marketFilter, setMarketFilter] = useState("Winner");
  const [tournamentFilter, setTournamentFilter] = useState("All");
  const [selectedMarketId, setSelectedMarketId] = useState<string>("home");
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

  // AI BYOK Settings
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [userAiProvider, setUserAiProvider] = useState<"gemini" | "openai">("gemini");
  const [userAiKey, setUserAiKey] = useState("");
  const [userAiModel, setUserAiModel] = useState("");

  // Load settings on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("orakick_ai_provider");
    const savedKey = localStorage.getItem("orakick_ai_key");
    const savedModel = localStorage.getItem("orakick_ai_model");
    if (savedProvider === "gemini" || savedProvider === "openai") setUserAiProvider(savedProvider);
    if (savedKey) setUserAiKey(savedKey);
    if (savedModel) setUserAiModel(savedModel);
  }, []);

  const saveAiSettings = () => {
    localStorage.setItem("orakick_ai_provider", userAiProvider);
    localStorage.setItem("orakick_ai_key", userAiKey);
    localStorage.setItem("orakick_ai_model", userAiModel);
    setShowAiSettings(false);
  };

  const getAiSettings = () => ({
    provider: userAiProvider,
    apiKey: userAiKey,
    model: userAiModel
  });

  // Fetch user's on-chain predictions
  useEffect(() => {
    if (!connected || !publicKey) {
      setMyPredictions([]);
      return;
    }
    async function fetchMyPredictions() {
      if (!connection || !publicKey) return;
      setLoadingPredictions(true);
      try {
        const { PublicKey } = await import("@solana/web3.js");
        const { Program, AnchorProvider, BN } = await import("@coral-xyz/anchor");
        const { IDL } = await import("@/lib/idl");

        const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
        const provider = new AnchorProvider(connection, wallet as any, {});
        const program = new Program(IDL as any, provider);

        // Fetch all matches from API to ensure we have the full mapping
        const res = await fetch("/txapi/fixtures");
        let allMatches = [...matches];
        if (res.ok) {
          const fixtures = await res.json();
          if (Array.isArray(fixtures)) {
            const txMatches = fixtures.map((f: any) => ({
              fixtureId: f.FixtureId,
              teamA: f.Participant1,
              teamB: f.Participant2,
            }));
            // Merge or replace based on your logic, here we just need them for mapping
          }
        }

        // Create mapping from PDA to match info
        const matchPdaMap: Record<string, { name: string, id?: number }> = {};
        // Use both current state matches and potential mocks
        [...MOCK_MATCHES, ...matches].forEach(m => {
          const onChainMatchId = m.fixtureId || m.id;
          if (!onChainMatchId) return;
          const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("match_market"), new BN(onChainMatchId).toArrayLike(Buffer, "le", 8)],
            PROGRAM_ID
          );
          matchPdaMap[pda.toBase58()] = { name: `${m.teamA} vs ${m.teamB}`, id: m.id };
        });

        const predictionDiscriminator = Buffer.from([98, 127, 141, 187, 218, 33, 8, 14]);
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { memcmp: { offset: 0, bytes: Buffer.from(predictionDiscriminator).toString("base64"), encoding: "base64" } },
            { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
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
              predLabel = outcome.teamAWin ? "Home Win" : outcome.teamBWin ? "Away Win" : "Draw";
            } else if (pt.overUnder) {
              predLabel = `${pt.overUnder.over ? "Over" : "Under"} ${(pt.overUnder.totalGoals || pt.overUnder.total_goals) / 2}`;
            } else if (pt.correctScore) {
              predLabel = `Score: ${pt.correctScore.scoreA || pt.correctScore.score_a}-${pt.correctScore.scoreB || pt.correctScore.score_b}`;
            }
            const amountUsdc = (decoded.amount?.toNumber?.() || decoded.amount) / 1_000_000;
            const mmPubkey = (decoded.matchMarket || decoded.match_market).toBase58();
            const mappedMatch = matchPdaMap[mmPubkey];
            
            predictions.push({
              match: mappedMatch ? mappedMatch.name : `Match ${mmPubkey.slice(0, 4)}`,
              matchId: mappedMatch?.id,
              predLabel,
              amount: amountUsdc,
              txSig: pubkey.toBase58(), // Use pubkey as fallback sig for uniqueness
              status: "Pending",
              matchMarketPubkey: mmPubkey,
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
  }, [connected, publicKey, connection, matches, wallet]);

  useEffect(() => {
    async function fetchTxLineData() {
      try {
        const res = await fetch("/txapi/fixtures");
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
              const oddsRes = await fetch(`/txapi/odds?fixtureId=${f.FixtureId}`);
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
            } catch (err) {
              console.warn(`Failed to load odds for fixture ${f.FixtureId}, using defaults:`, err);
            }

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
      } catch (err) {
        console.warn("TxLINE fixtures unavailable, falling back to mock data:", err);
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
    const userSettings = getAiSettings();
    fetch("/txapi/ai-coach", {
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
        userSettings,
      }),
    })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) setAiAdvice(data);
      })
      .catch((err) => {
        console.error("AI Coach error:", err);
        setAiAdvice(null);
      })
      .finally(() => setAiLoading(false));
  }, [selectedMatch, matches]);

  const handleAskCoach = async () => {
    if (!askCoachQuestion.trim() || askCoachLoading) return;
    setAskCoachLoading(true);
    const userSettings = getAiSettings();
    const selMatch = matches.find((m) => m.id === selectedMatch);
    try {
      const res = await fetch("/txapi/ai-coach/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askCoachQuestion, match: selMatch, userSettings }),
      });
      const data = await res.json();
      setAskCoachAnswer(data.answer);
    } catch (err) {
      console.error("Ask Coach error:", err);
      setAskCoachAnswer("Sorry, I'm having trouble responding right now.");
    } finally {
      setAskCoachLoading(false);
    }
  };

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
      
      const { PublicKey } = await import("@solana/web3.js");
      const { BN } = await import("@coral-xyz/anchor");
      const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
      const [matchMarket] = PublicKey.findProgramAddressSync(
        [Buffer.from("match_market"), new BN(onChainMatchId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

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
        matchId: selMatch?.id,
        predLabel,
        amount: parseFloat(amount),
        txSig: tx,
        status: "Pending",
        matchMarketPubkey: matchMarket.toBase58(),
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
        if (confirm("You need devnet USDC to place predictions.\n\nOpen Circle's devnet USDC faucet to grab some? (10 USDC, free, rate-limited to ~1h)")) {
          window.open("https://faucet.circle.com/", "_blank");
        }
      } else if (logs.includes("AccountNotInitialized")) {
        alert("Account not initialized. The match market or vault needs setup.");
      } else if (msg.includes("insufficient") || logs.includes("0x1")) {
        if (confirm("Insufficient devnet USDC balance.\n\nOpen Circle's devnet USDC faucet to top up?")) {
          window.open("https://faucet.circle.com/", "_blank");
        }
      } else if (msg.includes("User rejected")) {
        alert("Transaction cancelled.");
      } else {
        alert(`Transaction failed: ${msg}`);
      }
    }
  }, [connected, selectedMatch, amount, matches, predType, selectedOutcome, overUnderValue, overUnderSide, scoreA, scoreB, connection, wallet]);

  if (!mounted) {
    return <div className="min-h-screen bg-cream animate-pulse" />;
  }

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
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Orakick"
              width={300}
              height={100}
              className="h-24 w-auto"
            />
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-navy/70 hover:text-forest">
              Home
            </a>
            <div className="flex items-center gap-3 relative">
              {username ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 bg-forest/10 border border-forest/20 px-4 py-2 rounded-full hover:bg-forest/20 transition-all group"
                  >
                    <div className="w-6 h-6 bg-forest rounded-full flex items-center justify-center text-[10px] text-white font-black">
                      {username[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-forest uppercase tracking-tight">
                      {username}
                    </span>
                    <svg className={`w-3 h-3 text-forest transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-navy/5 py-2 z-20 animate-in fade-in slide-in-from-top-2">
                        <a href="/profile" className="block px-4 py-2 text-xs font-bold text-navy hover:bg-navy/5 transition-colors">MY PROFILE</a>
                        <button 
                          onClick={() => {
                            disconnect();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                        >
                          DISCONNECT WALLET
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <WalletButton />
              )}
            </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Left: Match list grouped by competition */}
            <div className="lg:col-span-3 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
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
                return (
                  <div className="space-y-6">
                    {/* Sidebar Filters */}
                    <div className="flex gap-2 mb-4 px-2 overflow-x-auto pb-2 no-scrollbar">
                      {["All", "Group A", "Group B", "Knockout"].map(f => (
                        <button 
                          key={f} 
                          onClick={() => setTournamentFilter(f)}
                          className={`whitespace-nowrap px-3 py-1 border rounded-lg text-[9px] font-bold transition-all ${
                            tournamentFilter === f 
                              ? "bg-forest text-white border-forest" 
                              : "bg-white/50 border-navy/5 text-navy/40 hover:bg-forest/10 hover:text-forest"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    {sortedKeys.filter(comp => tournamentFilter === "All" || (tournamentFilter === "Group A" && comp === "World Cup") || (tournamentFilter === "Group B" && comp === "Friendlies")).map((comp) => (
                  <div key={comp} className={`space-y-3 p-2 rounded-2xl transition-all ${comp === "World Cup" ? "bg-forest/5 border border-forest/20 shadow-sm" : ""}`}>
                    <h3 className={`font-bold uppercase tracking-widest px-2 ${comp === "World Cup" ? "text-forest text-[14px] mb-2" : "text-navy/40 text-[10px]"}`}>
                      {comp === "World Cup" ? "🏆 " : ""}{comp}
                    </h3>
                    <div className="space-y-1">
                      {groups[comp].map((match) => {
                        const active = selectedMatch === match.id;
                        return (
                          <div
                            key={match.id}
                            onClick={() => setSelectedMatch(match.id)}
                            className={`px-3 py-3 rounded-xl cursor-pointer transition-all border ${
                              active 
                                ? "bg-white border-forest/30 shadow-sm" 
                                : "border-transparent hover:bg-white/40"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] text-navy/40 font-mono">
                                {new Date(match.kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[9px] font-bold text-forest">${(match.pool/1000).toFixed(1)}k</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{match.flagA}</span>
                                  <span className={`text-xs font-medium ${active ? "text-navy" : "text-navy/70"}`}>{match.teamA}</span>
                                </div>
                                <span className="text-[10px] font-bold text-navy/30">{match.odds.home.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{match.flagB}</span>
                                  <span className={`text-xs font-medium ${active ? "text-navy" : "text-navy/70"}`}>{match.teamB}</span>
                                </div>
                                <span className="text-[10px] font-bold text-navy/30">{match.odds.away.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Main Center: Match Details + Chart + Yes/No Table + Chat */}
            <div className="lg:col-span-6 space-y-6">
              {(() => {
                const match = matches.find(m => m.id === selectedMatch);
                if (!match) return (
                  <div className="h-96 glass rounded-3xl flex items-center justify-center border border-white/30 text-navy/30 text-sm">
                    Select a match to view analytics
                  </div>
                );
                return (
                  <div className="space-y-6">
                    {/* Match Header */}
                    <div className="glass rounded-3xl p-6 border border-white/30">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-forest/10 text-forest text-[10px] font-bold rounded uppercase tracking-wider">Live Market</span>
                          <span className="text-[11px] text-navy/40">{match.competition} • {match.kickoff}</span>
                        </div>
                        <div className="flex -space-x-2">
                          {[1,2,3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-cream bg-sage/20 flex items-center justify-center text-[8px] font-bold">U{i}</div>
                          ))}
                          <div className="w-6 h-6 rounded-full border-2 border-cream bg-navy/10 flex items-center justify-center text-[8px] font-bold">+12</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between px-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center text-4xl shadow-sm">{match.flagA}</div>
                          <span className="font-bold text-navy">{match.teamA}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-3xl font-black text-navy/20 italic">VS</span>
                          <div className="mt-2 px-3 py-1 bg-navy/5 rounded-full text-[10px] font-bold text-navy/40 uppercase tracking-tighter">
                            Match Odds
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center text-4xl shadow-sm">{match.flagB}</div>
                          <span className="font-bold text-navy">{match.teamB}</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart Area */}
                    <div className="glass rounded-3xl p-6 border border-white/30">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-navy">Win Probability</h3>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-forest" />
                            <span className="text-[10px] font-medium text-navy/50">{match.teamA}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[10px] font-medium text-navy/50">{match.teamB}</span>
                          </div>
                        </div>
                      </div>
                      {mounted && <MatchChart match={match} points={liveDataPoints} />}
                      {!mounted && <div className="h-64 w-full bg-navy/5 animate-pulse rounded-2xl" />}
                    </div>

                    {/* Yes/No Prediction Table */}
                    <div className="glass rounded-3xl overflow-hidden border border-white/30">
                      <div className="px-6 py-4 border-b border-navy/5 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-navy">Outcome Markets</h3>
                        <div className="flex gap-2">
                          {["All", "Winner", "Goals"].map(f => (
                            <button 
                              key={f} 
                              onClick={() => setMarketFilter(f)}
                              className={`text-[10px] px-3 py-1 rounded-full transition-colors ${marketFilter === f ? "bg-forest text-white" : "text-navy/40 hover:bg-navy/5"}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="divide-y divide-navy/5">
                        {[
                          { id: "home", label: `${match.teamA} to Win`, home: true, odds: match.odds.home, cat: "Winner" },
                          { id: "draw", label: `Draw`, draw: true, odds: match.odds.draw, cat: "Winner" },
                          { id: "away", label: `${match.teamB} to Win`, away: true, odds: match.odds.away, cat: "Winner" },
                          { id: "over", label: `Over 2.5 Goals`, over: true, odds: 2.1, cat: "Goals" },
                          { id: "btts", label: `Both Teams to Score`, btts: true, odds: 1.85, cat: "Goals" },
                        ].filter(row => marketFilter === "All" || row.cat === marketFilter).map((row) => (
                          <div key={row.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/20 transition-colors group/row">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-navy">{row.label}</span>
                              <span className="text-[9px] font-bold text-navy/30 uppercase tracking-tighter">
                                Implied Prob: {Math.round(100/row.odds)}%
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedMatch(match.id);
                                  setOrderSide("buy");
                                  setSelectedMarketId(row.id);
                                  // Reset other types
                                  setScoreA("0"); setScoreB("0");
                                  
                                  if (row.home) { setPredType("winner"); setSelectedOutcome("home"); }
                                  else if (row.away) { setPredType("winner"); setSelectedOutcome("away"); }
                                  else if (row.draw) { setPredType("winner"); setSelectedOutcome("draw"); }
                                  else if (row.over) { setPredType("overunder"); setOverUnderSide("over"); setOverUnderValue("2.5"); }
                                  else if (row.btts) { setPredType("overunder"); setOverUnderSide("over"); setOverUnderValue("BTTS"); }
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                  orderSide === "buy" && selectedMarketId === row.id
                                    ? "bg-forest text-white border-forest shadow-sm"
                                    : "bg-forest/5 text-forest border-transparent hover:bg-forest/10"
                                }`}
                              >
                                Yes {Math.round(100/row.odds)}¢
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedMatch(match.id);
                                  setOrderSide("sell");
                                  setSelectedMarketId(row.id);
                                  // Reset other types
                                  setScoreA("0"); setScoreB("0");

                                  if (row.home) { setPredType("winner"); setSelectedOutcome("home"); }
                                  else if (row.away) { setPredType("winner"); setSelectedOutcome("away"); }
                                  else if (row.draw) { setPredType("winner"); setSelectedOutcome("draw"); }
                                  else if (row.over) { setPredType("overunder"); setOverUnderSide("over"); setOverUnderValue("2.5"); }
                                  else if (row.btts) { setPredType("overunder"); setOverUnderSide("over"); setOverUnderValue("BTTS"); }
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                  orderSide === "sell" && selectedMarketId === row.id
                                    ? "bg-red-500 text-white border-red-500 shadow-sm"
                                    : "bg-navy/5 text-navy/40 border-transparent hover:bg-navy/10"
                                }`}
                              >
                                No {100 - Math.round(100/row.odds)}¢
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Event Chat */}
                    <div className="glass rounded-3xl p-6 border border-white/30 space-y-4">
                      <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                        <span>💬</span> Event Chat
                        <span className="text-[10px] font-normal text-forest animate-pulse">• 242 online</span>
                      </h3>
                      <div className="h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar text-xs">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className="flex gap-2">
                            <span className={`font-bold ${msg.color}`}>{msg.user}:</span>
                            <span className="text-navy/60">{msg.text}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={connected ? "Send a message..." : "Connect wallet to chat"} 
                          disabled={!connected}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && chatInput.trim()) {
                              setChatMessages(prev => [...prev, { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, user: "You", text: chatInput, color: "text-forest" }]);
                              setChatInput("");
                            }
                          }}
                          className="flex-1 bg-white/50 border border-navy/5 rounded-xl px-4 py-2 text-xs text-navy placeholder:text-navy/30"
                        />
                        <button 
                          disabled={!connected} 
                          onClick={() => {
                            if (chatInput.trim()) {
                              setChatMessages(prev => [...prev, { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, user: "You", text: chatInput, color: "text-forest" }]);
                              setChatInput("");
                            }
                          }}
                          className="p-2 bg-forest text-white rounded-xl disabled:opacity-30"
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sidebar Right: Buy/Sell Panel + AI Coach */}
            <div className="lg:col-span-3 space-y-6 sticky top-28">
              {/* Buy/Sell Panel (Trading Interface) */}
              <div className="glass rounded-3xl p-6 border border-white/30 shadow-xl shadow-navy/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-navy">Order Panel</h3>
                  <div className="flex bg-navy/5 p-0.5 rounded-lg">
                    <button 
                      onClick={() => setOrderSide("buy")}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${orderSide === "buy" ? "bg-white shadow-sm text-navy" : "text-navy/40"}`}
                    >
                      BUY
                    </button>
                    <button 
                      onClick={() => setOrderSide("sell")}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${orderSide === "sell" ? "bg-white shadow-sm text-navy" : "text-navy/40"}`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                {!selectedMatch ? (
                  <p className="text-xs text-navy/30 py-10 text-center">Select a match to place orders</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-navy/40 px-1">
                        <span>ASSET</span>
                        <span>PRICE</span>
                      </div>
                      <div className="bg-forest/5 border border-forest/10 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-navy truncate max-w-[120px]">
                          {(() => {
                            const selMatch = matches.find(m => m.id === selectedMatch);
                            if (selectedMarketId === "home") return selMatch?.teamA;
                            if (selectedMarketId === "away") return selMatch?.teamB;
                            if (selectedMarketId === "draw") return "Draw";
                            if (selectedMarketId === "over") return "Over 2.5 Goals";
                            if (selectedMarketId === "btts") return "BTTS";
                            return "Select Asset";
                          })()}
                        </span>
                        <span className="text-xs font-black text-forest">
                          {(() => {
                            const selMatch = matches.find(m => m.id === selectedMatch);
                            let odds = 1;
                            if (selectedMarketId === "home") odds = selMatch?.odds.home || 1;
                            else if (selectedMarketId === "away") odds = selMatch?.odds.away || 1;
                            else if (selectedMarketId === "draw") odds = selMatch?.odds.draw || 1;
                            else if (selectedMarketId === "over") odds = 2.1;
                            else if (selectedMarketId === "btts") odds = 1.85;
                            
                            const price = orderSide === "buy" ? Math.round(100/odds) : (100 - Math.round(100/odds));
                            return price + "¢";
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-navy/40">STAKE AMOUNT</label>
                        <span className="text-[10px] text-forest font-bold">MAX</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-white/50 border border-navy/5 rounded-xl px-4 py-3 text-sm text-navy font-bold focus:ring-1 ring-forest/30 outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-navy/30">USDC</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[10, 50, 100, 500].map(v => (
                        <button key={v} onClick={() => setAmount(v.toString())} className="py-1.5 bg-navy/5 rounded-lg text-[10px] font-bold text-navy/40 hover:bg-navy/10">+{v}</button>
                      ))}
                    </div>

                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-navy/40">Potential Return</span>
                        <span className="font-bold text-forest">
                          {amount ? (parseFloat(amount) * 2.1).toFixed(2) : "0.00"} USDC
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-navy/40">Fee (0.5%)</span>
                        <span className="text-navy/60">0.00 USDC</span>
                      </div>
                    </div>

                    {connected ? (
                      <div className="space-y-2">
                        {(() => {
                          const selMatch = matches.find((m) => m.id === selectedMatch);
                          const started = selMatch ? new Date(selMatch.kickoff).getTime() < Date.now() : false;
                          const hasPredicted = myPredictions.some(p => p.matchMarketPubkey === selMatch?.marketPubkey);
                          
                          if (started) return (
                            <div className="w-full py-3 bg-red-500/20 text-red-600 font-medium rounded-full text-center text-sm">
                              Match already started
                            </div>
                          );
                          
                          if (loadingPredictions || hasPredicted) return (
                            <div className="w-full py-3 bg-navy/10 text-navy/60 font-medium rounded-full text-center text-sm">
                              {loadingPredictions ? "Checking existing predictions..." : "Prediction already placed"}
                            </div>
                          );

                          return (
                            <button
                              onClick={handlePredict}
                              disabled={!amount || parseFloat(amount) <= 0 || txStatus === "pending"}
                              className={`w-full py-3.5 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-40 ${
                                orderSide === "buy" ? "bg-forest shadow-forest/20 hover:bg-forest/90" : "bg-red-500 shadow-red-500/20 hover:bg-red-600"
                              }`}
                            >
                              {txStatus === "pending" ? "Executing..." : `${orderSide === "buy" ? "PLACE BUY ORDER" : "PLACE SELL ORDER"}`}
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
                      <div className="pt-2"><WalletButton /></div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Coach Sidebar Widget */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-purple-900/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">🤖</div>
                    <div>
                      <h4 className="text-xs font-bold leading-none uppercase">AI Coach</h4>
                      <span className="text-[8px] opacity-60 font-mono uppercase">{userAiProvider} Powered</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAiSettings(true)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="AI Settings"
                  >
                    ⚙️
                  </button>
                </div>

                {aiAdvice && !aiLoading ? (
                  <div className="space-y-3">
                    <p className="text-[11px] leading-relaxed opacity-90 italic">
                      &ldquo;{aiAdvice.reasoning}&rdquo;
                    </p>
                    <div className="bg-white/10 rounded-xl p-3">
                      <div className="text-[9px] font-bold opacity-60 uppercase mb-1">Top Pick</div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold">
                          {(() => {
                            const match = matches.find(m => m.id === selectedMatch);
                            if (aiAdvice.recommendation === "home") return `${match?.teamA} Win`;
                            if (aiAdvice.recommendation === "away") return `${match?.teamB} Win`;
                            return "Draw";
                          })()}
                        </span>
                        <span className="text-xs font-black text-green-300">{aiAdvice.confidence}%</span>
                      </div>
                    </div>
                    {aiAdvice.valueBet && (
                      <div className="text-[9px] opacity-70 border-t border-white/10 pt-2">
                        💡 {aiAdvice.valueBet}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] opacity-60 py-4">Waiting for match selection to generate insights...</p>
                )}

                <button 
                  onClick={() => setAskCoachOpen(true)}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold transition-all border border-white/10"
                >
                  OPEN ANALYSIS TOOL
                </button>
              </div>
              
              {/* My Predictions History (Compact) */}
              {connected && myPredictions.length > 0 && (
                <div className="glass rounded-3xl p-6 border border-white/30">
                  <h3 className="text-xs font-bold text-navy mb-4 flex justify-between">
                    RECENT TRADES
                    <span className="text-forest">LIVE</span>
                  </h3>
                  <div className="space-y-3">
                    {myPredictions.slice(0, 3).map((pred) => (
                      <div key={pred.txSig || `${pred.match}-${pred.predLabel}`} className="flex justify-between items-center border-b border-navy/5 pb-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-navy truncate max-w-[100px]">{pred.match}</span>
                          <span className="text-[9px] text-forest">{pred.predLabel}</span>
                        </div>
                        <span className="text-[10px] font-black text-navy">{pred.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* AI Settings Modal */}
      {showAiSettings && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-navy">AI Settings</h3>
              <button onClick={() => setShowAiSettings(false)} className="text-navy/40 hover:text-navy">✕</button>
            </div>
            <p className="text-xs text-navy/60 leading-relaxed">
              Use your own API keys for the AI Coach. Your keys are stored locally in your browser and never saved on our servers.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-navy/40 uppercase">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {["gemini", "openai"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setUserAiProvider(p as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        userAiProvider === p ? "bg-forest text-white border-forest shadow-lg" : "bg-white text-navy/40 border-navy/10 hover:border-navy/20"
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-navy/40 uppercase">API Key</label>
                <input
                  type="password"
                  placeholder={`Enter your ${userAiProvider} key`}
                  value={userAiKey}
                  onChange={(e) => setUserAiKey(e.target.value)}
                  className="w-full bg-navy/5 border border-navy/5 rounded-xl px-4 py-3 text-xs text-navy focus:ring-1 ring-forest/30 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-navy/40 uppercase">Model (Optional)</label>
                <input
                  type="text"
                  placeholder={userAiProvider === "gemini" ? "gemini-2.0-flash-lite" : "gpt-4o-mini"}
                  value={userAiModel}
                  onChange={(e) => setUserAiModel(e.target.value)}
                  className="w-full bg-navy/5 border border-navy/5 rounded-xl px-4 py-3 text-xs text-navy focus:ring-1 ring-forest/30 outline-none"
                />
              </div>
            </div>

            <button
              onClick={saveAiSettings}
              className="w-full py-4 bg-forest text-white font-bold rounded-2xl shadow-lg shadow-forest/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>
      )}

      {/* Ask Coach Modal */}
      {askCoachOpen && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <h3 className="text-xl font-bold text-navy">Ask Coach</h3>
              </div>
              <button onClick={() => setAskCoachOpen(false)} className="text-navy/40 hover:text-navy">✕</button>
            </div>

            <div className="space-y-4">
              <div className="bg-navy/5 rounded-2xl p-4 min-h-[100px] text-sm text-navy/80 leading-relaxed italic">
                {askCoachLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-forest rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-forest rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-forest rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <span className="text-xs font-bold text-forest ml-2 uppercase tracking-widest">Analysing...</span>
                  </div>
                ) : askCoachAnswer || "Ask me anything about this match. For example: \"Is Over 2.5 goals safe?\" or \"Who is likely to score first?\""}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Type your question..."
                  value={askCoachQuestion}
                  onChange={(e) => setAskCoachQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && askCoachQuestion.trim() && !askCoachLoading) {
                      handleAskCoach();
                    }
                  }}
                  className="w-full bg-white border border-navy/10 rounded-2xl px-5 py-4 text-sm text-navy outline-none focus:ring-2 ring-purple-500/20 pr-16"
                />
                <button
                  disabled={!askCoachQuestion.trim() || askCoachLoading}
                  onClick={handleAskCoach}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  SEND
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
