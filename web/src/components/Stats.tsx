import Image from "next/image";

const stats = [
  { label: "Win Rate", value: "89%", accent: "text-accent" },
  { label: "Prediction Accuracy", value: "91%", accent: "text-forest" },
  { label: "Successful Predictions", value: "12,481", accent: "text-golden" },
  { label: "Active Predictors", value: "35K+", accent: "text-sky" },
];

export default function Stats() {
  return (
    <section id="stats" className="relative py-32 px-6 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/stats-bg.svg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/40" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 bg-navy/5 rounded-full text-xs font-mono text-navy/60 uppercase tracking-wider">
            Live Scoreboard
          </div>
          <h2
            className="text-4xl md:text-5xl font-black text-navy tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Today&apos;s Match
          </h2>
        </div>

        {/* Scoreboard style */}
        <div className="relative bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-10 md:p-14 overflow-hidden">

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <div className={`text-4xl md:text-5xl font-black ${stat.accent}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-navy/50 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
