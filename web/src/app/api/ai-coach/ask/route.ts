import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function generateFallbackAnswer(question: string, match: any): string {
  const { teamA, teamB, odds, competition } = match;
  const q = question.toLowerCase();

  const impliedHome = 1 / odds.home;
  const impliedDraw = 1 / odds.draw;
  const impliedAway = 1 / odds.away;
  const total = impliedHome + impliedDraw + impliedAway;
  const probHome = Math.round((impliedHome / total) * 100);
  const probDraw = Math.round((impliedDraw / total) * 100);
  const probAway = Math.round((impliedAway / total) * 100);

  if (q.includes("over") || q.includes("under") || q.includes("goal")) {
    const isClose = Math.abs(probHome - probAway) < 15;
    if (isClose) {
      return `This is a closely matched game (${probHome}% vs ${probAway}%). Close matches tend to be cagier — Under 2.5 might be safer. However, if both teams need a result, Over 2.5 at around 1.90 could offer value.`;
    }
    return `With ${teamA} at ${probHome}% and ${teamB} at ${probAway}%, the favorite often controls tempo. If ${probHome > probAway ? teamA : teamB} dominates, expect goals — Over 2.5 is reasonable. If the underdog parks the bus, Under is safer.`;
  }

  if (q.includes("safe") || q.includes("safest")) {
    if (probHome >= 45) return `The safest bet is ${teamA} to win @ ${odds.home.toFixed(2)} — they have ${probHome}% implied probability. High confidence, lower return.`;
    if (probAway >= 45) return `The safest bet is ${teamB} to win @ ${odds.away.toFixed(2)} — they have ${probAway}% implied probability.`;
    return `No clear safe pick here. Market implies ${probHome}/${probDraw}/${probAway} split. Consider a smaller stake or Double Chance (if available).`;
  }

  if (q.includes("value") || q.includes("worth")) {
    const evHome = (probHome / 100) * odds.home;
    const evDraw = (probDraw / 100) * odds.draw;
    const evAway = (probAway / 100) * odds.away;
    const best = Math.max(evHome, evDraw, evAway);
    if (best === evDraw) return `The Draw @ ${odds.draw.toFixed(2)} offers the best expected value (EV: ${evDraw.toFixed(2)}). It's riskier but the odds overcompensate slightly.`;
    if (best === evAway) return `${teamB} @ ${odds.away.toFixed(2)} has positive EV (${evAway.toFixed(2)}). Market might be underrating them slightly.`;
    return `${teamA} @ ${odds.home.toFixed(2)} has the best EV (${evHome.toFixed(2)}). The market prices them fairly — it's not a huge edge, but it's the strongest pick.`;
  }

  if (q.includes("draw")) {
    return `Draw has ${probDraw}% implied probability @ ${odds.draw.toFixed(2)}. ${probDraw >= 30 ? "This is a realistic outcome given how close the teams are." : "The market doesn't favor a draw here, but World Cup knockout stages can surprise."}`;
  }

  if (q.includes(teamA.toLowerCase()) || q.includes("home")) {
    return `${teamA} has ${probHome}% implied probability @ ${odds.home.toFixed(2)}. ${probHome >= 45 ? "Strong favorite — lower risk, lower reward." : probHome >= 35 ? "Slight favorite but not dominant — moderate risk." : "Not strongly favored — higher risk bet."}`;
  }

  if (q.includes(teamB.toLowerCase()) || q.includes("away")) {
    return `${teamB} has ${probAway}% implied probability @ ${odds.away.toFixed(2)}. ${probAway >= 40 ? "Solid pick with decent odds." : "Underdog territory — higher risk but bigger payout if they pull through."}`;
  }

  // Generic answer
  return `Based on TxLINE odds: ${teamA} ${probHome}% (@ ${odds.home.toFixed(2)}) | Draw ${probDraw}% (@ ${odds.draw.toFixed(2)}) | ${teamB} ${probAway}% (@ ${odds.away.toFixed(2)}). ${competition.includes("World Cup") ? "World Cup matches tend to be tighter than odds suggest — consider risk management." : "Follow the market unless you have strong conviction otherwise."}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, match } = body;

    if (!question || !match) {
      return NextResponse.json({ error: "Missing question or match" }, { status: 400 });
    }

    const { teamA, teamB, odds, kickoff, competition } = match;

    // Try Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are an expert football betting coach. A user is asking about this match:

Match: ${teamA} vs ${teamB}
Competition: ${competition}
Kickoff: ${kickoff}
Live Odds (TxLINE oracle): Home ${odds.home.toFixed(2)} | Draw ${odds.draw.toFixed(2)} | Away ${odds.away.toFixed(2)}

User question: "${question}"

Give a concise, helpful answer in 2-3 sentences. Be specific with numbers and odds. Sound confident but acknowledge uncertainty. Do NOT use markdown formatting.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        const result = await model.generateContent(prompt);
        const answer = result.response.text().trim();
        return NextResponse.json({ answer, source: "gemini" });
      } catch (err) {
        console.error("Gemini ask-coach failed, falling back to odds analysis:", err);
      }
    }

    const answer = generateFallbackAnswer(question, match);
    return NextResponse.json({ answer, source: "odds-analysis" });
  } catch (err) {
    console.error("Ask Coach route error:", err);
    return NextResponse.json({ error: "Ask Coach error" }, { status: 500 });
  }
}
