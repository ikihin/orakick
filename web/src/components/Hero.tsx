export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-cream/70 backdrop-blur-[2px]" />
      </div>

      {/* Floating accents */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div className="absolute top-20 right-10 w-64 h-64 bg-sky/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-sage/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-golden/40 rounded-full animate-drift" />
        <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-sage/50 rounded-full animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-sky/40 rounded-full animate-drift" style={{ animationDelay: "2s" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 items-center relative z-10">
        {/* Left: Copy */}
        <div className="space-y-8">
          <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight text-navy" style={{ fontFamily: "var(--font-playfair)" }}>
            READ THE MATCH.
            <br />
            <span className="text-forest">TAKE YOUR SHOT.</span>
            <br />
            SCORE YOUR{" "}
            <span className="text-golden">PROFITS.</span>
          </h1>

          <p className="text-lg text-navy/60 max-w-md leading-relaxed">
            AI-powered World Cup predictions backed by cryptographic proofs on Solana. Predict outcomes, verify results trustlessly, win big.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#"
              className="px-8 py-4 bg-forest text-cream font-medium rounded-full hover:bg-forest/90 transition-all hover:shadow-lg hover:shadow-forest/20 hover:-translate-y-0.5"
            >
              Start Predicting →
            </a>
            <a
              href="#"
              className="px-8 py-4 border-2 border-navy/20 text-navy font-medium rounded-full hover:border-forest hover:text-forest transition-all hover:-translate-y-0.5"
            >
              Watch Demo
            </a>
          </div>

          <div className="flex items-center gap-6 pt-4 text-sm text-navy/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Live World Cup Data
            </div>
            <div>Powered by TxLINE</div>
          </div>
        </div>

      </div>
    </section>
  );
}
