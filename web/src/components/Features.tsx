import Image from "next/image";

const features = [
  {
    icon: "/icon-market-analysis.svg",
    title: "Market Analysis",
    description: "Real-time odds and match data streamed directly from TxLINE feeds.",
  },
  {
    icon: "/icon-ai-prediction.svg",
    title: "AI Prediction",
    description: "Smart predictions powered by live World Cup data and historical patterns.",
  },
  {
    icon: "/icon-risk-control.svg",
    title: "Risk Control",
    description: "Set your limits. Manage exposure across multiple match predictions.",
  },
  {
    icon: "/icon-entry-signals.svg",
    title: "Entry Signals",
    description: "Get notified when prediction windows open with optimal odds.",
  },
  {
    icon: "/icon-performance-tracking.svg",
    title: "Performance Tracking",
    description: "Track your prediction history, win rate, and profit over time.",
  },
  {
    icon: "/icon-leaderboard.svg",
    title: "Leaderboard",
    description: "Compete with other predictors. Top performers earn recognition.",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6 overflow-hidden">
      {/* Background image covering entire section */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/features-hero.png"
          alt="Football player with candlestick charts"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-cream/40" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2
            className="text-4xl md:text-5xl font-black text-navy tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Every Prediction Starts With Strategy.
          </h2>
          <p className="text-navy/50 text-lg max-w-2xl mx-auto">
            Tools designed for serious predictors who want an edge in the World Cup.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-8 hover:shadow-xl hover:shadow-white/20 hover:bg-white/30 transition-all hover:-translate-y-1 group"
            >
              <div className="mb-4 group-hover:scale-110 transition-transform">
                <Image src={feature.icon} alt={feature.title} width={160} height={160} className="w-40 h-40" unoptimized />
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">{feature.title}</h3>
              <p className="text-sm text-navy/50 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
