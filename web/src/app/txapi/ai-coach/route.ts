import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface MatchInput {
  teamA: string;
  teamB: string;
  odds: { home: number; draw: number; away: number };
  kickoff: string;
  competition: string;
}

// Smart fallback analysis when Gemini is unavailable
function analyzeWithOdds(match: MatchInput) {
  const { odds, teamA, teamB, competition } = match;

  const impliedHome = 1 / odds.home;
  const impliedDraw = 1 / odds.draw;
  const impliedAway = 1 / odds.away;
  const total = impliedHome + impliedDraw + impliedAway;

  const probHome = impliedHome / total;
  const probDraw = impliedDraw / total;
  const probAway = impliedAway / total;

  const confHome = Math.round(probHome * 100);
  const confDraw = Math.round(probDraw * 100);
  const confAway = Math.round(probAway * 100);

  let recommendation: "home" | "away" | "draw";
  let confidence: number;
  let favTeam: string;

  if (probHome >= probAway && probHome >= probDraw) {
    recommendation = "home"; confidence = confHome; favTeam = teamA;
  } else if (probAway >= probHome && probAway >= probDraw) {
    recommendation = "away"; confidence = confAway; favTeam = teamB;
  } else {
    recommendation = "draw"; confidence = confDraw; favTeam = "Draw";
  }

  const margin = ((total - 1) * 100).toFixed(1);
  const spread = Math.max(probHome, probAway, probDraw) - Math.min(probHome, probAway, probDraw);
  const riskLevel = spread > 0.25 ? "Low" : spread > 0.12 ? "Medium" : "High";

  // Determine value spot
  const evHome = probHome * odds.home;
  const evDraw = probDraw * odds.draw;
  const evAway = probAway * odds.away;
  const bestEv = Math.max(evHome, evDraw, evAway);
  let valueBet: string;
  if (bestEv === evAway && recommendation !== "away") {
    valueBet = `Value opportunity: ${teamB} @ ${odds.away.toFixed(2)} has positive expected value relative to implied odds.`;
  } else if (bestEv === evDraw && recommendation !== "draw") {
    valueBet = `Dark horse: Draw @ ${odds.draw.toFixed(2)} offers slight value — consider a hedge position.`;
  } else {
    valueBet = `Market is efficiently priced (${margin}% margin). ${favTeam} is the consensus pick.`;
  }

  let reasoning: string;
  const isWorldCup = competition.toLowerCase().includes("world cup");

  if (confidence >= 50) {
    reasoning = `${favTeam} is a clear favorite with ${confidence}% implied probability from live TxLINE odds. The market heavily backs this outcome at ${recommendation === "home" ? odds.home.toFixed(2) : recommendation === "away" ? odds.away.toFixed(2) : odds.draw.toFixed(2)}.${isWorldCup ? " World Cup knockout pressure could increase variance." : ""}`;
  } else if (confidence >= 38) {
    reasoning = `${favTeam} has a slight edge (${confidence}%) but this is a competitive match. The odds suggest bookmakers see this as close — consider your risk appetite.${isWorldCup ? " World Cup history shows upsets happen at this margin." : ""}`;
  } else {
    reasoning = `Extremely tight match — no clear favorite (${confHome}% / ${confDraw}% / ${confAway}%). Consider a smaller stake or Over/Under market for better risk management.${isWorldCup ? " World Cup matches at these odds often produce surprises." : ""}`;
  }

  return { recommendation, confidence, reasoning, valueBet, riskLevel };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { match } = body;

    if (!match || !match.odds || !match.teamA || !match.teamB) {
      return NextResponse.json({ error: "Invalid match data" }, { status: 400 });
    }

    // Try Gemini first
    if (process.env.GEMINI_API_KEY) {
      try {
        const { teamA, teamB, odds, kickoff, competition } = match;
        const prompt = `You are an expert football analyst for a prediction market. Analyze this match concisely.

Match: ${teamA} vs ${teamB}
Competition: ${competition}
Kickoff: ${kickoff}
Live Odds (TxLINE oracle): Home ${odds.home.toFixed(2)} | Draw ${odds.draw.toFixed(2)} | Away ${odds.away.toFixed(2)}

Consider: team strength, recent form, head-to-head history, tournament context, odds value.

Respond ONLY as JSON (no markdown):
{"recommendation":"home" or "away" or "draw","confidence":number 1-100,"reasoning":"2-3 sentences with specific football insight","valueBet":"1 sentence about odds value","riskLevel":"Low" or "Medium" or "High"}`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        let jsonStr = text;
        if (text.includes("```")) {
          jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        }

        const advice = JSON.parse(jsonStr);
        return NextResponse.json({ ...advice, source: "gemini" });
      } catch (geminiErr: any) {
        console.warn("Gemini fallback:", geminiErr?.message?.slice(0, 100));
      }
    }

    // Fallback: odds-based analysis
    const advice = analyzeWithOdds(match);
    return NextResponse.json({ ...advice, source: "odds-analysis" });
  } catch {
    return NextResponse.json({ error: "AI Coach error" }, { status: 500 });
  }
}
