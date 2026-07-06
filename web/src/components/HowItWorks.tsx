import Image from "next/image";

const steps = [
  { number: "01", title: "Scan Match", description: "Browse upcoming World Cup fixtures with live odds from TxLINE." },
  { number: "02", title: "AI Analysis", description: "Get AI-powered predictions based on real-time data and patterns." },
  { number: "03", title: "Place Prediction", description: "Lock your USDC prediction into a trustless on-chain escrow." },
  { number: "04", title: "Take Profit", description: "Results verified via Merkle proofs. Winnings auto-distributed." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 px-6 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/how-it-works-bg.svg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/50" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-20 space-y-4">
          <h2
            className="text-4xl md:text-5xl font-black text-navy tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            How It Works
          </h2>
          <p className="text-navy/50 text-lg">
            From kickoff to payout in four simple steps.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-sage/40 md:-translate-x-px" />

          <div className="space-y-16">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`relative flex items-center gap-8 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Step number on the line */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-forest text-cream flex items-center justify-center text-sm font-bold z-10">
                  {step.number}
                </div>

                {/* Content card */}
                <div className={`ml-20 md:ml-0 md:w-5/12 ${i % 2 === 0 ? "md:pr-16" : "md:pl-16"}`}>
                  <div className="glass rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="text-xs font-mono text-forest/60 mb-1">
                      STEP {step.number}
                    </div>
                    <h3 className="text-xl font-bold text-navy mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-navy/50 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden md:block md:w-5/12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
