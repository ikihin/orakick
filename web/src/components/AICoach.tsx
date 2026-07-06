"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function AICoach() {
  const [coachQuote, setCoachQuote] = useState(
    "Brazil vs Argentina — Brazil has 68% win probability based on current form. The over 2.5 goals market is showing value at current odds. Consider a split position."
  );

  useEffect(() => {
    async function fetchLiveAdvice() {
      try {
        const fixturesRes = await fetch("/api/fixtures");
        if (!fixturesRes.ok) return;
        const fixtures = await fixturesRes.json();
        if (!Array.isArray(fixtures) || fixtures.length === 0) return;

        const f = fixtures[0];
        const coachRes = await fetch("/api/ai-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match: {
              teamA: f.Participant1,
              teamB: f.Participant2,
              odds: { home: 2.1, draw: 3.2, away: 2.8 },
              kickoff: new Date(f.StartTime > 1e12 ? f.StartTime : f.StartTime * 1000).toUTCString(),
              competition: f.Competition || "World Cup",
            },
          }),
        });
        if (!coachRes.ok) return;
        const advice = await coachRes.json();
        if (advice.reasoning) {
          setCoachQuote(`${f.Participant1} vs ${f.Participant2} — ${advice.reasoning}`);
        }
      } catch {}
    }
    fetchLiveAdvice();
  }, []);

  return (
    <section id="ai-coach" className="relative py-32 px-6 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/ai-coach-bg.svg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/40" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: AI Coach illustration */}
          <div className="relative flex items-center justify-center order-2 lg:order-1">
            <div className="bg-forest/20 backdrop-blur-md border border-forest/30 rounded-3xl p-6 shadow-lg shadow-forest/10">
              <Image
                src="/ai-coach-img.svg"
                alt="AI Coach"
                width={500}
                height={600}
                className="w-full max-w-sm h-auto rounded-2xl"
                unoptimized
              />
            </div>
          </div>

          {/* Right: Content */}
          <div className="space-y-8 order-1 lg:order-2">
            <div className="space-y-4">
              <div className="inline-block px-4 py-1.5 bg-forest/10 rounded-full text-xs font-mono text-forest uppercase tracking-wider">
                AI Coach
              </div>
              <h2
                className="text-4xl md:text-5xl font-black text-navy tracking-tight"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Your Personal
                <br />
                Match Analyst.
              </h2>
              <p className="text-navy/50 text-lg leading-relaxed max-w-md">
                Get tactical insights before every match. Our AI analyzes
                real-time TxLINE data to give you the edge.
              </p>
            </div>

            {/* Speech bubble */}
            <div className="glass rounded-2xl p-6 relative max-w-md">
              <div className="absolute -left-3 top-8 w-6 h-6 glass rotate-45 border-r-0 border-t-0" />
              <div className="text-xs text-forest font-mono mb-2">
                Coach says:
              </div>
              <p className="text-navy/80 leading-relaxed">
                &ldquo;{coachQuote}&rdquo;
              </p>
            </div>

            <a href="/markets" className="inline-block px-8 py-4 bg-forest text-cream font-medium rounded-full hover:bg-forest/90 transition-all hover:shadow-lg hover:shadow-forest/20 hover:-translate-y-0.5">
              Ask Coach →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
